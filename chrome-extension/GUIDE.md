# KidGuard Chrome Extension - Installation & Usage Guide

## 📦 Installation

### Prerequisites
- Google Chrome browser (version 88 or higher)
- Access to the extension files in `/app/chrome-extension/`

### Installation Steps

1. **Open Chrome Extensions Page**
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Or click menu (⋮) → More tools → Extensions

2. **Enable Developer Mode**
   - Look for the "Developer mode" toggle in the top-right corner
   - Turn it ON

3. **Load Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `/app/chrome-extension/` folder
   - Click "Select Folder"

4. **Verify Installation**
   - You should see "KidGuard - Child Online Grooming Detection" in your extensions list
   - The extension icon (🛡️) should appear in your Chrome toolbar

### Note on Icons
The extension references icon files (icon16.png, icon48.png, icon128.png) which are placeholders. The extension will work without them, but you can add custom icons for a better visual experience.

## ⚙️ Setup & Configuration

### First-Time Setup

1. **Get Your Parent ID**
   - Visit the parent dashboard: https://kidguard-chat-1.preview.emergentagent.com
   - Create your parent account
   - **Copy your Parent ID** (shown on the dashboard)

2. **Configure Extension**
   - Click the KidGuard extension icon in Chrome toolbar
   - Enter your **Parent ID** (from step 1)
   - Enter your child's name
   - Click "Save Settings"

3. **Verify Configuration**
   - The popup should show "Monitoring Active" status
   - Your settings are saved and will persist

## 🎮 Using the Extension

### Automatic Monitoring

Once configured, the extension automatically:

1. **Detects Roblox**
   - Activates when visiting any roblox.com page
   - Monitors in-game chat interfaces

2. **Analyzes Messages**
   - Applies grooming detection rules to every message
   - Calculates risk scores in real-time

3. **Updates Badge**
   - OK (green): No risks detected
   - ⚠ (orange): Medium risk patterns found
   - 🚨 (red): High risk - alert triggered

### Extension Popup

Click the extension icon to see:

- **Status Indicator**: Current monitoring state
- **Message Count**: Number of messages analyzed
- **Last Activity**: Time of most recent activity
- **Configuration**: Update Parent ID or child name
- **Actions**: 
  - Open Dashboard → View full incident history
  - View Logs → Download local conversation logs

## 🔍 What Gets Monitored

### Monitored Content
✅ **Sent chat messages** on Roblox  
✅ **Visible usernames** in chat  
✅ **Platform context** (Roblox game URL)  

### NOT Monitored
❌ Keystrokes or typing (only sent messages)  
❌ Voice chat  
❌ Private messages outside Roblox  
❌ Other browser activity  

## 🚨 Alert System

### Risk Levels

**Low Risk (0-3 points)**
- Logged locally
- No alert sent
- Badge stays green

**Medium Risk (4-6 points)**
- Flagged for review
- Stored in database
- Badge turns orange
- No SMS alert

**High Risk (7+ points)**
- Immediate SMS alert to parent
- Evidence file downloaded to Downloads folder
- Stored in database
- Badge turns red
- Marked as high priority in dashboard

### Evidence Files

When high-risk patterns are detected:

1. **Automatic Download**
   - JSON file saved to your Downloads folder
   - Filename: `kidguard-evidence-[timestamp].json`

2. **Evidence Contents**
   - The detected message
   - Username who sent it
   - Risk score and detected patterns
   - Last 10 messages for context
   - Timestamp and platform info

3. **Using Evidence**
   - Can be shared with authorities
   - Contains all necessary context
   - Preserves original chat data

## 🛠️ Troubleshooting

### Extension Not Working

**Problem**: Extension not monitoring  
**Solutions**:
- Ensure you're on roblox.com domain
- Refresh the Roblox page
- Check browser console for errors (F12 → Console)
- Look for "KidGuard: Content script loaded" message

**Problem**: No Parent ID set  
**Solutions**:
- Click extension icon
- Enter Parent ID from dashboard
- Click "Save Settings"

**Problem**: Messages not being detected  
**Solutions**:
- Roblox may have changed their chat interface
- Check browser console for "KidGuard: Found chat container" message
- The extension looks for common chat element patterns

### Data Not Showing in Dashboard

**Problem**: Dashboard shows no incidents  
**Solutions**:
- Verify Parent ID in extension matches dashboard
- Check internet connection
- Ensure backend is running
- Check browser console for API errors

### SMS Alerts Not Received

**Problem**: No SMS for high-risk incidents  
**Solutions**:
- Verify Twilio credentials in backend
- Check phone number format (+1234567890)
- Ensure alerts are enabled for parent account
- Check backend logs for SMS send errors

### Permission Issues

**Problem**: Extension doesn't have access  
**Solutions**:
- Check host permissions in chrome://extensions/
- Should include: roblox.com and the backend URL
- Reload extension after granting permissions

## 🔐 Privacy & Security

### Local Storage
- Extension uses Chrome's `storage.local` API
- Data stored only in your browser
- Not accessible to other websites
- Persists until extension is removed

### Data Transmission
- Only sends data to configured backend API
- Uses HTTPS for secure transmission
- No third-party tracking or analytics
- Parent has full control over data

### What Parents See
- Detected messages and risk patterns
- Username of message sender
- Platform and URL context
- Timestamp of incident
- Risk score and categories

### What Parents DON'T See
- Keystrokes or typing activity
- Unsubmitted messages
- Other browser activity
- Personal data beyond chat messages

## 📊 Understanding Detection

### Example Detections

**High Risk (Score: 12)**
```
Message: "how old are you? don't tell your parents, add me on discord"
Patterns Detected:
- Age Probing (+3)
- Isolation Attempts (+5)
- Off-Platform Migration (+4)
Result: SMS alert + Evidence file
```

**Medium Risk (Score: 5)**
```
Message: "you're special, keep this between us"
Patterns Detected:
- Emotional Manipulation (+2)
- Isolation Attempts (+5)
Result: Flagged for review, no SMS
```

**Low Risk (Score: 2)**
```
Message: "you're really good at this game"
Patterns Detected:
- Emotional Manipulation (+2)
Result: Logged only
```

## 🔄 Updates & Maintenance

### Updating the Extension

1. Pull latest code from repository
2. Chrome will prompt to reload extension
3. Or manually reload in chrome://extensions/

### Clearing Data

To reset extension:
1. Right-click extension icon
2. Remove from Chrome
3. Delete from chrome://extensions/
4. Reinstall from scratch

### Backup Configuration

Your Parent ID and child name are stored locally. To backup:
1. Click extension icon
2. Copy your Parent ID
3. Store safely for future use

## 📱 Multi-Device Setup

To monitor multiple devices:

1. **Install on each device**
   - Install extension on each Chrome browser
   - Use the same Parent ID for all installations
   - Update child name if different children use different devices

2. **View all activity**
   - Dashboard shows incidents from all devices
   - Each incident shows which child it's associated with

## 🆘 Getting Help

### Check Logs

**Extension Logs**:
- Open browser console (F12 → Console)
- Look for "KidGuard:" prefixed messages
- Shows detection events and API calls

**Backend Logs**:
- Check `/var/log/supervisor/backend.err.log`
- Shows API requests and SMS send status

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Extension not loading | Check Developer Mode is ON |
| No monitoring active | Verify you're on roblox.com |
| Parent ID not working | Confirm ID matches dashboard |
| High CPU usage | Normal during active monitoring |
| Badge not updating | Refresh Roblox page |

## 🚀 Advanced Usage

### Custom Risk Rules

To modify detection rules, edit `/app/chrome-extension/detector.js`:

```javascript
this.rules = {
  customPattern: {
    patterns: [/your custom regex/i],
    score: 4,
    category: 'Custom Category'
  }
};
```

### Debug Mode

To see detailed detection logs:
1. Open browser console (F12)
2. Messages show analysis results
3. Check network tab for API calls

### Manual Evidence Export

To manually export conversation logs:
1. Click extension icon
2. Click "View Logs" button
3. JSON file downloads automatically

## 📖 Related Documentation

- **Main README**: `/app/README.md`
- **API Documentation**: Backend server.py
- **Dashboard Guide**: Parent dashboard UI
- **Detection Rules**: detector.js source code

## 🤝 Support Contacts

- Dashboard: https://kidguard-chat-1.preview.emergentagent.com
- Backend API: https://kidguard-chat-1.preview.emergentagent.com/api/

---

**Remember**: This tool is designed to assist parents in protecting their children online. It should be used as part of a broader approach to internet safety, including open communication with children about online dangers.
