# KidGuard - Deployment & Configuration Guide

## 🚀 Production Deployment

### Backend Configuration

#### 1. Environment Variables

Edit `/app/backend/.env`:

```env
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="kidguard_production"

# CORS (Update for production domain)
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# Twilio SMS Integration
TWILIO_ACCOUNT_SID="your_actual_account_sid_here"
TWILIO_AUTH_TOKEN="your_actual_auth_token_here"
TWILIO_PHONE_NUMBER="+1234567890"
```

#### 2. Get Twilio Credentials

**Step 1: Sign Up**
- Visit https://www.twilio.com/
- Create a free account (includes trial credits)
- Verify your email

**Step 2: Get Credentials**
- Go to Twilio Console Dashboard
- Copy **Account SID**
- Copy **Auth Token** (click to reveal)

**Step 3: Get Phone Number**
- In Console, go to Phone Numbers → Buy a Number
- Select a number with SMS capability
- Copy the phone number in E.164 format (+12345678901)

**Step 4: Configure**
- Add credentials to `/app/backend/.env`
- Restart backend: `sudo supervisorctl restart backend`

#### 3. Test SMS Functionality

```bash
# Test SMS endpoint
curl -X POST https://your-domain.com/api/alert/sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+14155551234",
    "message": "KidGuard test alert"
  }'
```

### Frontend Configuration

#### 1. Update Backend URL

Edit `/app/frontend/.env`:

```env
REACT_APP_BACKEND_URL=https://your-backend-domain.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

#### 2. Build for Production

```bash
cd /app/frontend
yarn build
```

### Chrome Extension Configuration

#### 1. Update Backend URL

Edit `/app/chrome-extension/content-script.js`:

```javascript
const BACKEND_URL = 'https://your-backend-domain.com/api';
```

And `/app/chrome-extension/popup.js`:

```javascript
const DASHBOARD_URL = 'https://your-dashboard-domain.com';
```

#### 2. Update Permissions

Edit `/app/chrome-extension/manifest.json`:

```json
{
  "host_permissions": [
    "https://*.roblox.com/*",
    "https://your-backend-domain.com/*"
  ]
}
```

#### 3. Create Extension Package

```bash
cd /app/chrome-extension
zip -r kidguard-extension.zip .
```

## 🗄️ Database Setup

### MongoDB Collections

The system uses two main collections:

**parents**
```javascript
{
  id: String (UUID),
  name: String,
  phone: String,
  email: String (optional),
  children: Array<String>,
  alertsEnabled: Boolean,
  createdAt: ISOString
}
```

**incidents**
```javascript
{
  id: String (UUID),
  message: String,
  username: String,
  platform: String,
  url: String,
  riskLevel: String (low|medium|high),
  riskScore: Number,
  detectedPatterns: Array<{
    category: String,
    score: Number,
    pattern: String
  }>,
  timestamp: ISOString,
  parentId: String,
  childName: String,
  alertSent: Boolean,
  reviewed: Boolean
}
```

### Database Indexes

For better performance, create these indexes:

```javascript
// MongoDB shell commands
db.parents.createIndex({ id: 1 }, { unique: true });
db.parents.createIndex({ phone: 1 });

db.incidents.createIndex({ id: 1 }, { unique: true });
db.incidents.createIndex({ parentId: 1 });
db.incidents.createIndex({ timestamp: -1 });
db.incidents.createIndex({ riskLevel: 1 });
db.incidents.createIndex({ reviewed: 1 });
```

## 🔐 Security Considerations

### Backend Security

1. **Enable CORS Properly**
   ```python
   # Only allow specific origins in production
   CORS_ORIGINS="https://yourdomain.com"
   ```

2. **Add Rate Limiting**
   ```python
   # Install slowapi
   pip install slowapi
   
   # Add to server.py
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)
   ```

3. **Add Authentication** (Future Enhancement)
   ```python
   # JWT tokens for API access
   # Parent login system
   # Session management
   ```

4. **Secure Twilio Credentials**
   - Never commit credentials to version control
   - Use environment variables only
   - Rotate credentials periodically

### Extension Security

1. **Content Security Policy**
   - Extension uses Chrome's built-in CSP
   - Only communicates with configured backend

2. **Data Storage**
   - Uses Chrome's storage.local API
   - Encrypted by browser
   - Isolated per-extension

3. **Network Security**
   - All API calls use HTTPS
   - No third-party analytics
   - No external tracking

## 📊 Monitoring & Logging

### Backend Logs

**View Logs**:
```bash
# Real-time logs
tail -f /var/log/supervisor/backend.err.log

# Last 100 lines
tail -n 100 /var/log/supervisor/backend.err.log

# Search for errors
grep "ERROR" /var/log/supervisor/backend.err.log
```

**Log Levels**:
- INFO: Normal operations
- WARNING: Twilio not configured, minor issues
- ERROR: API failures, database errors

### Extension Logs

**Browser Console**:
- Open Developer Tools (F12)
- Go to Console tab
- Filter for "KidGuard"

**Key Messages**:
- "KidGuard: Content script loaded" → Extension active
- "KidGuard: Found chat container" → Chat detected
- "KidGuard: Processing message" → Message analyzed
- "KidGuard: Alert sent to backend" → High-risk incident

### SMS Delivery Logs

Check Twilio Console:
- Go to Monitor → Logs → Messaging
- View delivery status for each SMS
- Debug failed deliveries

## 🧪 Testing Procedures

### Test Complete Flow

1. **Setup Test Parent**
   ```bash
   curl -X POST https://your-domain.com/api/parents \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Parent","phone":"+1YOUR_PHONE"}'
   ```

2. **Get Parent ID**
   - Copy ID from response
   - Save for extension setup

3. **Configure Extension**
   - Install extension in Chrome
   - Enter test Parent ID
   - Enter child name "Test Child"

4. **Simulate High-Risk Incident**
   ```bash
   curl -X POST https://your-domain.com/api/incidents \
     -H "Content-Type: application/json" \
     -d '{
       "message": "how old are you dont tell anyone add me on discord",
       "username": "test_user",
       "platform": "Roblox",
       "url": "https://roblox.com/test",
       "riskLevel": "high",
       "riskScore": 12,
       "detectedPatterns": [
         {"category": "Age Probing", "score": 3, "pattern": "how old"},
         {"category": "Isolation", "score": 5, "pattern": "dont tell"},
         {"category": "Migration", "score": 4, "pattern": "discord"}
       ],
       "timestamp": "2025-01-26T00:00:00.000Z",
       "parentId": "YOUR_PARENT_ID",
       "childName": "Test Child"
     }'
   ```

5. **Verify**
   - ✅ SMS received on test phone
   - ✅ Incident appears in dashboard
   - ✅ Stats updated correctly

### Performance Testing

**Load Test**:
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test API endpoint
ab -n 1000 -c 10 https://your-domain.com/api/
```

**Concurrent Users**:
- Test 10-100 parents simultaneously
- Monitor database performance
- Check API response times

## 🔄 Maintenance

### Daily Tasks
- ✅ Check backend logs for errors
- ✅ Verify SMS deliveries in Twilio Console
- ✅ Monitor database size

### Weekly Tasks
- ✅ Review incident reports with parents
- ✅ Check for extension updates needed
- ✅ Verify Twilio credit balance
- ✅ Database backup

### Monthly Tasks
- ✅ Analyze detection accuracy
- ✅ Update grooming patterns if needed
- ✅ Review and improve rules
- ✅ Security audit

### Database Backup

```bash
# Backup MongoDB
mongodump --db kidguard_production --out /backup/$(date +%Y%m%d)

# Restore if needed
mongorestore --db kidguard_production /backup/20250126/kidguard_production
```

## 📈 Scaling Considerations

### For 100+ Parents

1. **Database Optimization**
   - Add more indexes
   - Consider MongoDB Atlas (managed)
   - Implement data archival

2. **Backend Scaling**
   - Deploy multiple backend instances
   - Add load balancer
   - Use Redis for caching

3. **SMS Optimization**
   - Batch similar alerts
   - Add cooldown period (prevent spam)
   - Consider alternative notification channels

### For NGO/School Deployment

1. **Multi-Tenant Support**
   - Add organization/school models
   - Admin dashboard for schools
   - Bulk parent registration

2. **Compliance Features**
   - GDPR/COPPA compliance tools
   - Data retention policies
   - Audit logs

3. **Reporting**
   - Aggregate statistics
   - Trend analysis
   - Export capabilities

## 🌍 Multi-Platform Support (Future)

### Discord Integration
- Similar content script pattern
- Different DOM selectors
- Same detection engine

### Instagram/WhatsApp
- Requires different approach
- May need browser automation
- Platform API restrictions

### Mobile Apps
- React Native app for parents
- Push notifications
- Real-time dashboard

## 💰 Cost Estimation

### Twilio Costs
- SMS: ~$0.0075 per message (US)
- 1000 alerts/month = ~$7.50
- Free trial includes credits

### Infrastructure
- MongoDB: Free tier supports 512MB
- Backend: ~$5-20/month (depending on hosting)
- Frontend: Free on Netlify/Vercel

### Total Monthly Cost
- Small deployment (10-50 parents): ~$10-30
- Medium deployment (100-500 parents): ~$50-150
- Large deployment (1000+ parents): Custom pricing

## 📞 Support Resources

### Twilio Support
- Docs: https://www.twilio.com/docs/sms
- Support: https://support.twilio.com/
- Status: https://status.twilio.com/

### MongoDB Support
- Docs: https://docs.mongodb.com/
- Community: https://www.mongodb.com/community/forums/

### Chrome Extension
- Docs: https://developer.chrome.com/docs/extensions/
- Web Store: https://chrome.google.com/webstore/

## 🎓 Training Materials

### For Parents
- Dashboard walkthrough video (to be created)
- Extension setup guide (included)
- Understanding risk scores PDF
- What to do when alerts arrive

### For NGO Staff
- Bulk deployment procedures
- Parent onboarding checklist
- Incident response protocols
- Technical troubleshooting guide

### For Researchers
- Detection algorithm documentation
- Anonymized data collection procedures
- Research ethics considerations
- Data analysis templates

## 📋 Deployment Checklist

- [ ] Twilio account created and configured
- [ ] Environment variables set correctly
- [ ] Database indexes created
- [ ] Backend tested with curl
- [ ] Frontend build successful
- [ ] Extension configured with production URLs
- [ ] Test parent account created
- [ ] End-to-end test completed
- [ ] SMS alert received successfully
- [ ] Dashboard shows test incidents
- [ ] Documentation reviewed
- [ ] Backup procedures established
- [ ] Monitoring in place
- [ ] Support contacts documented

---

**Note**: This is a prototype system. For production deployment serving many families, consult with security experts, legal counsel, and child safety professionals.
