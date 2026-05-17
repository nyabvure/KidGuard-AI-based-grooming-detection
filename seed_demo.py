"""
Demo seed script — clears all incidents and inserts 7 realistic demo scenarios.
2 HIGH  |  3 MEDIUM  |  2 LOW
Run from the app root: venv/Scripts/python.exe seed_demo.py
"""
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
import os, uuid

load_dotenv(Path(__file__).parent / "backend" / ".env")

from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
db_name   = os.environ["DB_NAME"]

def ts(hours_ago: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(hours=hours_ago)

def make_ctx(messages: list[dict]) -> list[dict]:
    """Build a conversation context list."""
    return [
        {"text": m["text"], "username": m["username"],
         "timestamp": (ts(0.1)).isoformat()}
        for m in messages
    ]

INCIDENTS = [
    # ── HIGH 1 ────────────────────────────────────────────────────────────────
    {
        "message": "hey can we move our chat to discord? its more private and ur parents wont see it there",
        "username": "ShadowGamer_99",
        "platform": "Roblox",
        "url": "https://www.roblox.com/games/12345/adventure",
        "riskLevel": "high",
        "riskScore": 9,
        "detectedPatterns": [
            {"category": "Platform Migration", "score": 4, "pattern": "move to discord"},
            {"category": "Secrecy Request",   "score": 3, "pattern": "parents won't see"},
            {"category": "Isolation",          "score": 2, "pattern": "more private"},
        ],
        "timestamp": ts(2),
        "childName": "Nathan Jr",
        "alertSent": True,
        "reviewed": False,
        "aiLabel": "grooming",
        "aiConfidence": 0.97,
        "aiReason": "Attempting to migrate conversation to an unmonitored platform while explicitly hiding it from parents — a classic isolation and secrecy grooming tactic.",
        "conversationContext": make_ctx([
            {"username": "ShadowGamer_99", "text": "hey you're really good at this game"},
            {"username": "ShadowGamer_99", "text": "how long have you been playing?"},
            {"username": "NathanJr",       "text": "like a year lol"},
            {"username": "ShadowGamer_99", "text": "cool cool, how old are you?"},
            {"username": "NathanJr",       "text": "10"},
            {"username": "ShadowGamer_99", "text": "nice, I'm 15. do you have discord?"},
            {"username": "ShadowGamer_99", "text": "hey can we move our chat to discord? its more private and ur parents wont see it there"},
        ]),
    },

    # ── HIGH 2 ────────────────────────────────────────────────────────────────
    {
        "message": "you seem really mature for your age, can you send me a pic of yourself? just curious what you look like",
        "username": "ProPlayer_XoXo",
        "platform": "Roblox",
        "url": "https://www.roblox.com/games/67890/roleplay-world",
        "riskLevel": "high",
        "riskScore": 10,
        "detectedPatterns": [
            {"category": "Photo Request",  "score": 5, "pattern": "send me a pic"},
            {"category": "Flattery",       "score": 3, "pattern": "mature for your age"},
            {"category": "Age Probing",    "score": 2, "pattern": "what you look like"},
        ],
        "timestamp": ts(5),
        "childName": "Nathan Jr",
        "alertSent": True,
        "reviewed": False,
        "aiLabel": "grooming",
        "aiConfidence": 0.99,
        "aiReason": "Requesting a photograph of a child while using flattery about maturity — a direct image solicitation grooming tactic.",
        "conversationContext": make_ctx([
            {"username": "ProPlayer_XoXo", "text": "hey you play really well"},
            {"username": "ProPlayer_XoXo", "text": "are you a boy or girl?"},
            {"username": "NathanJr",       "text": "boy"},
            {"username": "ProPlayer_XoXo", "text": "how old are you?"},
            {"username": "NathanJr",       "text": "10"},
            {"username": "ProPlayer_XoXo", "text": "you seem really mature for your age, can you send me a pic of yourself? just curious what you look like"},
        ]),
    },

    # ── MEDIUM 1 ──────────────────────────────────────────────────────────────
    {
        "message": "what school do you go to? and what time do you usually get home? we should play together more",
        "username": "CoolDude_2026",
        "platform": "Roblox",
        "url": "https://www.roblox.com/games/11111/battle-arena",
        "riskLevel": "medium",
        "riskScore": 6,
        "detectedPatterns": [
            {"category": "Location Probing",  "score": 3, "pattern": "what school do you go to"},
            {"category": "Schedule Probing",  "score": 3, "pattern": "what time do you get home"},
        ],
        "timestamp": ts(10),
        "childName": "Nathan Jr",
        "alertSent": True,
        "reviewed": False,
        "aiLabel": "grooming",
        "aiConfidence": 0.88,
        "aiReason": "Asking for school name and daily schedule — information used to locate or predict when a child is alone and unsupervised.",
        "conversationContext": make_ctx([
            {"username": "CoolDude_2026", "text": "hey wanna team up?"},
            {"username": "NathanJr",      "text": "sure"},
            {"username": "CoolDude_2026", "text": "where are you from?"},
            {"username": "NathanJr",      "text": "zimbabwe"},
            {"username": "CoolDude_2026", "text": "what school do you go to? and what time do you usually get home? we should play together more"},
        ]),
    },

    # ── MEDIUM 2 ──────────────────────────────────────────────────────────────
    {
        "message": "I can give you 10000 free Robux, just keep it between us and don't tell your friends or parents",
        "username": "RobuxKing_Free",
        "platform": "Roblox",
        "url": "https://www.roblox.com/home",
        "riskLevel": "medium",
        "riskScore": 7,
        "detectedPatterns": [
            {"category": "Gift/Bribe",     "score": 4, "pattern": "free robux"},
            {"category": "Secrecy",        "score": 3, "pattern": "don't tell your parents"},
        ],
        "timestamp": ts(18),
        "childName": "Nathan Jr",
        "alertSent": True,
        "reviewed": False,
        "aiLabel": "grooming",
        "aiConfidence": 0.91,
        "aiReason": "Offering gifts (Robux) combined with a secrecy demand is a textbook grooming tactic used to establish a hidden relationship with a child.",
        "conversationContext": make_ctx([
            {"username": "RobuxKing_Free", "text": "hey do you want free robux?"},
            {"username": "NathanJr",       "text": "how?"},
            {"username": "RobuxKing_Free", "text": "I have a method that works"},
            {"username": "RobuxKing_Free", "text": "I can give you 10000 free Robux, just keep it between us and don't tell your friends or parents"},
        ]),
    },

    # ── MEDIUM 3 ──────────────────────────────────────────────────────────────
    {
        "message": "you're so much more mature than kids your age, I feel like we have a real special connection, not like normal game friends",
        "username": "Friendly_Mike88",
        "platform": "Roblox",
        "url": "https://www.roblox.com/games/22222/social-hangout",
        "riskLevel": "medium",
        "riskScore": 5,
        "detectedPatterns": [
            {"category": "Flattery",        "score": 3, "pattern": "more mature than kids your age"},
            {"category": "Special Bond",    "score": 2, "pattern": "real special connection"},
        ],
        "timestamp": ts(26),
        "childName": "Nathan Jr",
        "alertSent": False,
        "reviewed": False,
        "aiLabel": "grooming",
        "aiConfidence": 0.83,
        "aiReason": "Using flattery about maturity and establishing a 'special' exclusive connection are early-stage grooming tactics designed to build emotional dependency.",
        "conversationContext": make_ctx([
            {"username": "Friendly_Mike88", "text": "hey you seem like a cool kid"},
            {"username": "NathanJr",        "text": "thanks"},
            {"username": "Friendly_Mike88", "text": "how old are you?"},
            {"username": "NathanJr",        "text": "10"},
            {"username": "Friendly_Mike88", "text": "you're so much more mature than kids your age, I feel like we have a real special connection, not like normal game friends"},
        ]),
    },

    # ── LOW 1 ─────────────────────────────────────────────────────────────────
    {
        "message": "are you home alone right now? just wondering if we can voice chat",
        "username": "GamingBuddy_404",
        "platform": "Roblox",
        "url": "https://www.roblox.com/games/33333/simulator",
        "riskLevel": "low",
        "riskScore": 3,
        "detectedPatterns": [
            {"category": "Supervision Check", "score": 2, "pattern": "home alone"},
            {"category": "Communication Shift", "score": 1, "pattern": "voice chat"},
        ],
        "timestamp": ts(36),
        "childName": "Nathan Jr",
        "alertSent": False,
        "reviewed": False,
        "aiLabel": "grooming",
        "aiConfidence": 0.72,
        "aiReason": "Checking whether a child is home alone and then requesting voice communication is a pattern used to establish unsupervised contact.",
        "conversationContext": make_ctx([
            {"username": "GamingBuddy_404", "text": "hey wanna play together?"},
            {"username": "NathanJr",        "text": "yeah sure"},
            {"username": "GamingBuddy_404", "text": "are you home alone right now? just wondering if we can voice chat"},
        ]),
    },

    # ── LOW 2 ─────────────────────────────────────────────────────────────────
    {
        "message": "how old are you? you play really well for someone young",
        "username": "StarPlayer_Zed",
        "platform": "Roblox",
        "url": "https://www.roblox.com/games/44444/obby",
        "riskLevel": "low",
        "riskScore": 2,
        "detectedPatterns": [
            {"category": "Age Probing", "score": 2, "pattern": "how old are you"},
        ],
        "timestamp": ts(48),
        "childName": "Nathan Jr",
        "alertSent": False,
        "reviewed": False,
        "aiLabel": "grooming",
        "aiConfidence": 0.75,
        "aiReason": "Directly asking a child's age on a children's gaming platform is a primary grooming indicator used to identify and target younger, more vulnerable victims.",
        "conversationContext": make_ctx([
            {"username": "StarPlayer_Zed", "text": "nice moves on that obby"},
            {"username": "NathanJr",       "text": "haha thanks"},
            {"username": "StarPlayer_Zed", "text": "how old are you? you play really well for someone young"},
        ]),
    },
]

async def seed():
    db_client = AsyncIOMotorClient(mongo_url)
    database  = db_client[db_name]

    # ── 1. Clear existing incidents ───────────────────────────────────────────
    result = await database.incidents.delete_many({})
    print(f"Cleared {result.deleted_count} existing incident(s).")

    # ── 2. Use the logged-in parent's ID ─────────────────────────────────────
    parent_id = "1f3f71c4-94ae-44da-a769-c990fff9c345"
    print(f"Using parentId: {parent_id}")

    # ── 3. Insert demo incidents ──────────────────────────────────────────────
    docs = []
    for inc in INCIDENTS:
        doc = {
            "id":                 str(uuid.uuid4()),
            "message":            inc["message"],
            "username":           inc["username"],
            "platform":           inc["platform"],
            "url":                inc["url"],
            "riskLevel":          inc["riskLevel"],
            "riskScore":          inc["riskScore"],
            "detectedPatterns":   inc["detectedPatterns"],
            "timestamp":          inc["timestamp"],
            "parentId":           parent_id,
            "childName":          inc["childName"],
            "alertSent":          inc["alertSent"],
            "reviewed":           False,
            "aiLabel":            inc["aiLabel"],
            "aiConfidence":       inc["aiConfidence"],
            "aiReason":           inc["aiReason"],
            "conversationContext": inc["conversationContext"],
        }
        docs.append(doc)

    await database.incidents.insert_many(docs)
    print(f"\nInserted {len(docs)} demo incidents:")
    for d in docs:
        level = d["riskLevel"].upper().ljust(6)
        score = str(d["riskScore"]).ljust(2)
        print(f"  [{level}] score={score}  AI={d['aiConfidence']:.0%}  \"{d['message'][:55]}...\"")

    db_client.close()
    print("\nDone. Refresh the dashboard to see the demo incidents.")

asyncio.run(seed())
