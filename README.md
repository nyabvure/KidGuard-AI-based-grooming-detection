# KidGuard - Child Online Grooming Detection Prototype

## 🛡️ Overview

KidGuard is a comprehensive child online protection system designed to detect and prevent grooming attempts on gaming platforms like Roblox. The system uses rule-based detection, real-time monitoring, SMS alerts, and evidence preservation to protect children from online predators.

## 🏗️ System Architecture

### Components

1. **Chrome Extension** - Monitors Roblox chat in real-time
2. **FastAPI Backend** - Processes incidents and sends alerts
3. **React Dashboard** - Parent monitoring interface
4. **MongoDB Database** - Stores incidents and parent data
5. **Twilio SMS** - Real-time SMS alerts for high-risk incidents

### Flow Diagram

```
Roblox Chat → Chrome Extension → Risk Detection Engine
                                         ↓
                                    Backend API
                                         ↓
                        ┌────────────────┼────────────────┐
                        ↓                ↓                ↓
                  MongoDB Storage   SMS Alert      Parent Dashboard
                                   (Twilio)
```

## 🚀 Quick Start

### 1. Backend Setup

Navigate to backend and configure Twilio credentials:

```bash
cd /app/backend
```

Edit `.env` file with your Twilio credentials:

```env
TWILIO_ACCOUNT_SID="your_actual_account_sid"
TWILIO_AUTH_TOKEN="your_actual_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"
```

**Get Twilio Credentials:**
1. Sign up at [twilio.com](https://www.twilio.com/)
2. Get Account SID and Auth Token from Console
3. Get a phone number from Twilio Console

### 2. Access Parent Dashboard

Visit: https://kidguard-chat-1.preview.emergentagent.com

1. Enter your name, phone number (with country code), and email
2. Click "Create Account"
3. **Copy your Parent ID** - you'll need this for the Chrome extension

### 3. Install Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `/app/chrome-extension` folder
5. The KidGuard icon will appear in your toolbar

### 4. Configure Extension

1. Click the KidGuard extension icon
2. Enter your **Parent ID** (from dashboard)
3. Enter your child's name
4. Click "Save Settings"

### 5. Test the System

When your child visits Roblox and chats, the extension will:
- Monitor messages in real-time
- Detect grooming patterns
- Send high-risk alerts via SMS
- Log all incidents in the dashboard

## 🎯 Grooming Detection Rules

### Risk Patterns & Scores

| Category | Patterns | Score |
|----------|----------|-------|
| **Age Probing** | "how old are you", "what grade are you in" | +3 |
| **Isolation Attempts** | "don't tell your parents", "keep this secret" | +5 |
| **Off-Platform Migration** | "add me on Discord", "my WhatsApp is" | +4 |
| **Emotional Manipulation** | "you're special", "I understand you" | +2 |
| **Scheduling/Privacy** | "when are you alone", "are your parents home" | +4 |

### Risk Thresholds

- **0-3 points**: Low Risk (Log only)
- **4-6 points**: Medium Risk (Flag for review)
- **7+ points**: High Risk (SMS alert + evidence capture)

## 📱 Features

### Chrome Extension

✅ Real-time Roblox chat monitoring  
✅ Pattern-based grooming detection  
✅ Local evidence preservation (JSON files)  
✅ Badge notifications (OK/⚠️/🚨)  
✅ Quick status popup  

### Parent Dashboard

✅ Real-time incident monitoring  
✅ Risk statistics (High/Medium/Low)  
✅ Detailed incident reports  
✅ Review and mark incidents  
✅ Parent ID management  

### Backend API

✅ RESTful API endpoints  
✅ MongoDB data persistence  
✅ Twilio SMS integration  
✅ Incident tracking  
✅ Parent management  

## 🔧 API Endpoints

### Parents

```bash
# Create parent account
POST /api/parents
{
  "name": "Jane Doe",
  "phone": "+14155551234",
  "email": "jane@example.com"
}

# Get parent by ID
GET /api/parents/{parent_id}

# Get all parents
GET /api/parents
```

### Incidents

```bash
# Create incident (from extension)
POST /api/incidents
{
  "message": "how old are you",
  "username": "stranger123",
  "platform": "Roblox",
  "riskLevel": "high",
  "riskScore": 8,
  ...
}

# Get incidents (filter by parent)
GET /api/incidents?parentId={parent_id}

# Get incident by ID
GET /api/incidents/{incident_id}

# Mark incident as reviewed
PATCH /api/incidents/{incident_id}/review
```

### Stats

```bash
# Get statistics
GET /api/stats?parentId={parent_id}

# Response:
{
  "totalIncidents": 5,
  "highRisk": 1,
  "mediumRisk": 2,
  "lowRisk": 2,
  "reviewed": 3,
  "unreviewed": 2
}
```

### SMS Alerts

```bash
# Send SMS manually
POST /api/alert/sms
{
  "phone": "+14155551234",
  "message": "Alert message"
}
```

## 🗂️ Project Structure

```
/app/
├── chrome-extension/          # Chrome Extension
│   ├── manifest.json          # Extension configuration
│   ├── content-script.js      # Roblox chat monitor
│   ├── background.js          # Service worker
│   ├── detector.js            # Grooming detection engine
│   ├── popup.html/js          # Extension popup UI
│   └── styles.css             # Popup styles
│
├── backend/                   # FastAPI Backend
│   ├── server.py              # Main API
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
│
├── frontend/                  # React Dashboard
│   └── src/
│       ├── App.js             # Main app
│       ├── pages/
│       │   └── Dashboard.js   # Parent dashboard
│       └── components/
│           └── incidents/
│               └── IncidentList.js
│
└── README.md                  # This file
```

## 🧪 Testing

### Test Chrome Extension

1. Visit any Roblox page
2. Open Developer Tools → Console
3. Look for "KidGuard: Content script loaded"
4. Click extension icon to see status

### Test Detection Engine

```javascript
// In browser console on Roblox
const detector = new GroomingDetector();
const result = detector.analyzeMessage("how old are you don't tell your parents");
console.log(result);
// Expected: { riskLevel: 'high', totalScore: 8, ... }
```

## 🎨 Dashboard Screenshots

### Setup Page
Clean and simple parent registration with name, phone, and email.

### Main Dashboard
- **Stats Cards**: High/Medium/Low risk counts
- **Recent Incidents**: Detailed incident reports with review functionality
- **Parent Info**: Display name, phone, and Parent ID
- **Setup Instructions**: Chrome extension installation guide

## 🔐 Privacy & Ethics

### Data Privacy
- **Local-First**: Extension stores data locally in browser
- **Minimal Collection**: Only message content, username, platform, timestamp
- **No Keystroke Logging**: Only monitors sent messages
- **Parent Control**: Parents own and control all data

### Evidence Preservation
- Automatic JSON file downloads for high-risk incidents
- Contains: message, patterns detected, timestamp, context
- Stored in user's Downloads folder
- Can be shared with authorities if needed

### Ethical Considerations
- Transparent detection rules (not a black box)
- Clear communication with parents
- Focus on child safety, not surveillance
- Compliant with child protection laws

## 📊 NGO & Research Use

### Problem Statement
Online grooming increasingly occurs on gaming platforms where traditional parental controls fail to detect social engineering and manipulation tactics.

### Solution
A lightweight, browser-based protection tool that detects grooming patterns in real-time, alerts parents early, and preserves evidence for intervention.

### Target Stakeholders
- Parents and guardians
- Child safety NGOs
- Schools and youth programs
- Policymakers and regulators

### Impact Goals
- Early detection of grooming attempts
- Reduced child exposure to predatory behavior
- Increased parental awareness and intervention
- Evidence collection for law enforcement

### Deployment Models

**1. Pilot Program (NGO-backed)**
- Partner with child safety organizations
- Deploy to 50-100 families
- Collect anonymized data on detection accuracy
- Iterate on rules based on expert feedback

**2. School Program**
- Integrate with school computer labs
- IT administrators configure for all devices
- Parent opt-in required
- Monthly safety reports to parents

**3. Community Rollout**
- Open-source the extension
- Provide setup guides for parents
- Host community support forums
- Partner with law enforcement for training

## 🚀 Future Enhancements

### Phase 2 Features
- [ ] Multi-platform support (Discord, WhatsApp, Instagram)
- [ ] AI/ML-based detection for improved accuracy
- [ ] Real-time conversation context analysis
- [ ] Parent mobile app for on-the-go monitoring
- [ ] Multi-language support
- [ ] Integration with school safety systems

### Advanced Detection
- [ ] Image analysis for inappropriate content
- [ ] Voice chat monitoring
- [ ] Behavioral pattern analysis
- [ ] Predator network mapping

### Enterprise Features
- [ ] Admin dashboard for schools
- [ ] Bulk deployment tools
- [ ] Compliance reporting
- [ ] Integration with existing safety tools

## 🆘 Support & Resources

### Twilio Setup Help
If SMS alerts aren't working:
1. Verify Twilio credentials in `/app/backend/.env`
2. Check Twilio phone number is verified
3. Ensure phone numbers include country code (+1234567890)
4. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`

### Extension Troubleshooting
- **Not monitoring?** Check if on roblox.com domain
- **No data?** Click extension icon to verify Parent ID is set
- **No alerts?** Check risk score threshold (must be 7+)

### Dashboard Issues
- **Can't create account?** Check backend is running
- **No incidents showing?** Verify Parent ID in extension matches dashboard
- **SMS not received?** Check Twilio configuration

## 📞 Contact & Support

For questions or support:
- **Reach out**: nathannyabvure@gmail.com
- **Documentation**: /app/README.md

## 📄 License

This prototype is designed for research, educational, and child safety purposes. 

---

**Built with ❤️ for child safety**
