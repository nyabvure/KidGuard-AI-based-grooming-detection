from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import time
from collections import defaultdict
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from twilio.rest import Client
import bcrypt
import jwt as pyjwt
import anthropic as anthropic_sdk
import json
import re
from incident_logic import apply_ai_adjustment, normalize_and_sort_incidents

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'kidguard-secret-key-change-in-production')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ── Anthropic AI client ────────────────────────────────────────────────────────
ai_client = None
try:
    anthropic_api_key = os.environ.get('ANTHROPIC_API_KEY')
    if anthropic_api_key:
        ai_client = anthropic_sdk.AsyncAnthropic(api_key=anthropic_api_key)
        logging.info("Anthropic AI client initialized successfully")
except Exception as e:
    logging.warning(f"Anthropic AI not configured: {e}")

AI_SYSTEM_PROMPT = """You are a child safety AI protecting children on Roblox, an online gaming platform used predominantly by children aged 6-16.

Every message you analyse was sent by an unknown adult or user to a child on Roblox. Your job is to detect grooming behaviour - manipulation tactics adults use to exploit children online.

IMPORTANT CONTEXT:
- Roblox is a children's platform. Any adult asking personal questions here is suspicious.
- Grooming is a gradual process. Even a single question can be the first step.
- Treat ambiguous messages as grooming when they involve personal information about a child.

CLASSIFY AS GROOMING if the message:
1. Asks age, grade, school, location, or when the child is home alone
2. Tells the child to hide the conversation from parents or adults
3. Tries to move the conversation off Roblox (Discord, WhatsApp, Snapchat, texting, etc.)
4. Flatters the child's maturity, appearance, or says they are special or different from others
5. Offers gifts, Robux, game items, or money - especially tied to secrecy
6. Requests photos, selfies, or videos of the child
7. Suggests or plans an in-person meeting
8. Uses isolation language: just us, only you and me, our secret, dont tell anyone
9. Expresses romantic or sexual interest in the child

These may appear as normal spelling, internet slang, abbreviations, number substitutions, or intentional misspellings designed to bypass filters (e.g. hw old r u, disc0rd, dnt tel ur parnts).

CLASSIFY AS SAFE if the message is clearly about:
- Gameplay, game mechanics, scores, or teamwork
- Trading or buying in-game items without secrecy conditions
- General greetings or reactions to gameplay

When in doubt, classify as GROOMING. A false positive is far less harmful than a missed grooming attempt against a child.

Reply with ONLY a raw JSON object, no markdown:
{"label": "grooming" or "safe", "confidence": 0.0-1.0, "reason": "one sentence explaining the specific grooming tactic detected or why it is safe"}"""

async def classify_with_ai(message: str) -> dict:
    if not ai_client:
        return None
    try:
        response = await ai_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            system=AI_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": message}]
        )
        text = response.content[0].text.strip()
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text).strip()
        return json.loads(text)
    except Exception as e:
        logging.error(f"AI classification failed: {e}")
        return None

# Twilio client
twilio_client = None
twilio_phone = None
twilio_messaging_service_sid = None

try:
    account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
    twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')
    twilio_messaging_service_sid = os.environ.get('TWILIO_MESSAGING_SERVICE_SID')

    if account_sid and auth_token:
        twilio_client = Client(account_sid, auth_token)
        logging.info("Twilio client initialized successfully")
except Exception as e:
    logging.warning(f"Twilio not configured: {e}")

# ── Rate limiting ──────────────────────────────────────────────────────────────
_rate_limit_store: dict = defaultdict(list)

def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    now = time.time()
    window_start = now - window_seconds
    _rate_limit_store[key] = [t for t in _rate_limit_store[key] if t > window_start]
    if len(_rate_limit_store[key]) >= max_requests:
        return False
    _rate_limit_store[key].append(now)
    return True

# ── Auth ───────────────────────────────────────────────────────────────────────
security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = pyjwt.decode(credentials.credentials, SECRET_KEY, algorithms=['HS256'])
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired, please log in again")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def create_token(parent_id: str, email: str, name: str) -> str:
    payload = {
        'parentId': parent_id,
        'email': email,
        'name': name,
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }
    return pyjwt.encode(payload, SECRET_KEY, algorithm='HS256')

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ── Models ─────────────────────────────────────────────────────────────────────
class Parent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    phone: str
    email: Optional[str] = None
    children: List[str] = []
    alertsEnabled: bool = True
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ParentCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None

class DetectedPattern(BaseModel):
    category: str
    score: int
    pattern: str

class Incident(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    message: str
    username: str
    platform: str
    url: str
    riskLevel: str
    riskScore: int
    detectedPatterns: List[DetectedPattern]
    timestamp: datetime
    parentId: Optional[str] = None
    childName: str
    alertSent: bool = False
    reviewed: bool = False
    aiLabel: Optional[str] = None
    aiConfidence: Optional[float] = None
    aiReason: Optional[str] = None
    conversationContext: Optional[List[dict]] = None

class IncidentCreate(BaseModel):
    message: str
    username: str
    platform: str
    url: str
    riskLevel: str
    riskScore: int
    detectedPatterns: List[DetectedPattern]
    timestamp: str
    parentId: Optional[str] = None
    childName: str
    conversationContext: Optional[List[dict]] = None

class SMSAlert(BaseModel):
    phone: str
    message: str

class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    token: str
    parentId: str
    name: str

# ── Routes ─────────────────────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "KidGuard API - Child Online Grooming Detection", "version": "1.0.0"}

# ── Parent endpoints ───────────────────────────────────────────────────────────
@api_router.post("/parents", response_model=Parent)
async def create_parent(input: ParentCreate):
    import uuid
    parent_dict = input.model_dump()
    parent_id = str(uuid.uuid4())
    parent_obj = Parent(id=parent_id, **parent_dict, children=[], alertsEnabled=True)
    doc = parent_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.parents.insert_one(doc)
    return parent_obj

@api_router.get("/parents/{parent_id}", response_model=Parent)
async def get_parent(parent_id: str, token: dict = Depends(verify_token)):
    # Ensure parent can only access their own profile
    if token.get('parentId') != parent_id:
        raise HTTPException(status_code=403, detail="Access denied")

    parent = await db.parents.find_one({"id": parent_id}, {"_id": 0})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    if isinstance(parent['createdAt'], str):
        parent['createdAt'] = datetime.fromisoformat(parent['createdAt'])
    return parent

# ── Incident endpoints ─────────────────────────────────────────────────────────
@api_router.post("/incidents", response_model=Incident)
async def create_incident(input: IncidentCreate, request: Request):
    import uuid

    # Rate limit: max 60 incidents per hour per parentId
    rate_key = f"incident:{input.parentId or request.client.host}"
    if not check_rate_limit(rate_key, max_requests=60, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many incidents submitted. Try again later.")

    # Validate parentId exists if provided
    if input.parentId:
        parent = await db.parents.find_one({"id": input.parentId}, {"_id": 0})
        if not parent:
            raise HTTPException(status_code=400, detail="Invalid parentId")

    incident_dict = input.model_dump()
    incident_id = str(uuid.uuid4())

    timestamp_str = incident_dict.pop('timestamp')
    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))

    # ── AI classification ──────────────────────────────────────────────────────
    ai_result = await classify_with_ai(input.message)
    ai_label = None
    ai_confidence = None
    ai_reason = None

    if ai_result:
        ai_label = ai_result.get('label', '').lower()
        ai_confidence = float(ai_result.get('confidence', 0.0))
        ai_reason = ai_result.get('reason', '')

        # AI is the final arbiter — it can both upgrade AND downgrade
        apply_ai_adjustment(incident_dict, ai_result)

    incident_obj = Incident(
        id=incident_id,
        **incident_dict,
        timestamp=timestamp,
        alertSent=False,
        reviewed=False,
        aiLabel=ai_label,
        aiConfidence=ai_confidence,
        aiReason=ai_reason,
    )

    doc = incident_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.incidents.insert_one(doc)

    # Send SMS alert if high risk
    if incident_obj.riskLevel == 'high' and incident_obj.parentId:
        try:
            parent = await db.parents.find_one({"id": incident_obj.parentId}, {"_id": 0})
            if parent and parent.get('alertsEnabled') and parent.get('phone'):
                # Rate limit SMS: max 5 per hour per parent
                sms_key = f"sms:{incident_obj.parentId}"
                if not check_rate_limit(sms_key, max_requests=5, window_seconds=3600):
                    logging.warning(f"SMS rate limit reached for parent {incident_obj.parentId}")
                else:
                    detected_time = incident_obj.timestamp.strftime("%b %d, %Y at %I:%M %p")
                    patterns = ", ".join(p.category for p in incident_obj.detectedPatterns) if incident_obj.detectedPatterns else "Unknown"
                    ai_note = f"AI: {incident_obj.aiReason}" if incident_obj.aiReason else ""
                    alert_message = (
                        f"🚨 KidGuard ALERT\n"
                        f"Child: {incident_obj.childName}\n"
                        f"Platform: {incident_obj.platform}\n"
                        f"Risk Level: {incident_obj.riskLevel.upper()} (Score: {incident_obj.riskScore}/10)\n"
                        f"Flagged: \"{incident_obj.message[:80]}{'...' if len(incident_obj.message) > 80 else ''}\"\n"
                        f"Pattern(s): {patterns}\n"
                        f"Sender: {incident_obj.username}\n"
                        f"Time: {detected_time}\n"
                        + (f"{ai_note}\n" if ai_note else "")
                        + f"Login to your KidGuard dashboard to review the full conversation."
                    )
                    await send_sms_alert(parent['phone'], alert_message)
                    await db.incidents.update_one(
                        {"id": incident_id},
                        {"$set": {"alertSent": True}}
                    )
                    incident_obj.alertSent = True
        except Exception as e:
            logging.error(f"Failed to send SMS alert: {e}")

    return incident_obj

@api_router.get("/incidents", response_model=List[Incident])
async def get_incidents(parentId: Optional[str] = None, limit: int = 100, token: dict = Depends(verify_token)):
    # Ensure parent can only see their own incidents
    if parentId and token.get('parentId') != parentId:
        raise HTTPException(status_code=403, detail="Access denied")

    query = {}
    if parentId:
        query['parentId'] = parentId
    else:
        query['parentId'] = token.get('parentId')

    incidents = await db.incidents.find(query, {"_id": 0}).to_list(limit)
    return normalize_and_sort_incidents(incidents)

@api_router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str, token: dict = Depends(verify_token)):
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident.get('parentId') != token.get('parentId'):
        raise HTTPException(status_code=403, detail="Access denied")
    if isinstance(incident['timestamp'], str):
        incident['timestamp'] = datetime.fromisoformat(incident['timestamp'])
    return incident

@api_router.patch("/incidents/{incident_id}/review")
async def mark_incident_reviewed(incident_id: str, token: dict = Depends(verify_token)):
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident.get('parentId') != token.get('parentId'):
        raise HTTPException(status_code=403, detail="Access denied")

    await db.incidents.update_one({"id": incident_id}, {"$set": {"reviewed": True}})
    return {"message": "Incident marked as reviewed"}

@api_router.delete("/incidents/{incident_id}")
async def delete_incident(incident_id: str, token: dict = Depends(verify_token)):
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident.get('parentId') != token.get('parentId'):
        raise HTTPException(status_code=403, detail="Access denied")

    await db.incidents.delete_one({"id": incident_id})
    return {"message": "Incident deleted"}

# ── Stats endpoint ─────────────────────────────────────────────────────────────
@api_router.get("/stats")
async def get_stats(parentId: Optional[str] = None, token: dict = Depends(verify_token)):
    # Always scope to the authenticated parent
    scoped_parent_id = token.get('parentId')
    query = {'parentId': scoped_parent_id}

    total_incidents = await db.incidents.count_documents(query)
    high_risk = await db.incidents.count_documents({**query, "riskLevel": "high"})
    medium_risk = await db.incidents.count_documents({**query, "riskLevel": "medium"})
    low_risk = await db.incidents.count_documents({**query, "riskLevel": "low"})
    reviewed = await db.incidents.count_documents({**query, "reviewed": True})

    return {
        "totalIncidents": total_incidents,
        "highRisk": high_risk,
        "mediumRisk": medium_risk,
        "lowRisk": low_risk,
        "reviewed": reviewed,
        "unreviewed": total_incidents - reviewed
    }

# ── SMS endpoint ───────────────────────────────────────────────────────────────
@api_router.post("/alert/sms")
async def send_sms(alert: SMSAlert, token: dict = Depends(verify_token)):
    sms_key = f"sms:{token.get('parentId')}"
    if not check_rate_limit(sms_key, max_requests=5, window_seconds=3600):
        raise HTTPException(status_code=429, detail="SMS rate limit reached. Try again later.")
    try:
        await send_sms_alert(alert.phone, alert.message)
        return {"message": "SMS sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def send_sms_alert(phone: str, message: str):
    if not twilio_client:
        logging.warning("Twilio not configured, SMS not sent")
        return
    try:
        params = {"body": message, "to": phone}
        if twilio_messaging_service_sid:
            params["messaging_service_sid"] = twilio_messaging_service_sid
        else:
            params["from_"] = twilio_phone
        message_obj = twilio_client.messages.create(**params)
        logging.info(f"SMS sent successfully: {message_obj.sid}")
    except Exception as e:
        logging.error(f"Failed to send SMS: {e}")
        raise

# ── Auth endpoints ─────────────────────────────────────────────────────────────
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(input: RegisterRequest):
    import uuid
    existing = await db.parents.find_one({"email": input.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = bcrypt.hashpw(input.password.encode(), bcrypt.gensalt()).decode()
    parent_id = str(uuid.uuid4())

    parent_obj = Parent(
        id=parent_id,
        name=input.name,
        phone=input.phone,
        email=input.email,
        children=[],
        alertsEnabled=True
    )

    doc = parent_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    doc['password_hash'] = password_hash
    await db.parents.insert_one(doc)

    token = create_token(parent_id, input.email, input.name)
    return TokenResponse(token=token, parentId=parent_id, name=input.name)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(input: LoginRequest, request: Request):
    # Rate limit: max 10 login attempts per IP per 15 minutes
    rate_key = f"login:{request.client.host}"
    if not check_rate_limit(rate_key, max_requests=10, window_seconds=900):
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")

    parent = await db.parents.find_one({"email": input.email})
    if not parent or not parent.get('password_hash'):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not bcrypt.checkpw(input.password.encode(), parent['password_hash'].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(parent['id'], parent['email'], parent['name'])
    return TokenResponse(token=token, parentId=parent['id'], name=parent['name'])

# ── App configuration ──────────────────────────────────────────────────────────
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
