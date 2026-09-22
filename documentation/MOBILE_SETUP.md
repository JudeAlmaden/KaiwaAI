# Mobile App Setup Guide

## Architecture

Your KaiwaAI app uses a **client-server architecture**:
- **Web App**: Runs on your server (Next.js with API routes + database)
- **Mobile App**: Capacitor WebView that connects to your server

## Development Setup

### 1. Configure Server URL

Edit `.env` file and set the mobile app server URL:

```env
# For Android Emulator
CAPACITOR_SERVER_URL="http://10.0.2.2:3000"

# For Physical Device (replace with your computer's IP)
CAPACITOR_SERVER_URL="http://192.168.1.100:3000"

# For Production
CAPACITOR_SERVER_URL="https://your-domain.com"
```

### 2. Start Your Server

In one terminal:
```bash
npm run dev
```

This starts your Next.js server on `http://localhost:3000`

### 3. Find Your IP (for Physical Device)

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig | grep inet
```

#### Update Capacitor Config:

Edit `capacitor.config.ts`:
```typescript
server: {
  url: 'http://YOUR_IP:3000',  // e.g., 'http://192.168.1.100:3000'
  cleartext: true
}
```

### 3. Sync and Run

```bash
npm run cap:sync      # Sync files to Android
npm run cap:android   # Open Android Studio
```

In Android Studio, click Run (green play button)

## Production Setup

### Option A: Deploy to a Server

1. Deploy your Next.js app to a server (Vercel, Railway, etc.)
2. Update `capacitor.config.ts`:
```typescript
server: {
  url: 'https://your-domain.com',
  cleartext: false  // Use HTTPS in production
}
```

### Option B: Bundled Server (Advanced)

Package a Node.js server inside your Android app:
- Use Termux or similar to run Node.js on Android
- More complex but fully offline

## App Blocker Feature

The app blocker works **entirely on the device**:
- No server needed for blocking functionality
- Settings stored locally in SharedPreferences
- Monitoring happens in Android background service

The only server communication is for:
- Fetching flashcards from your database
- Syncing study progress
- User authentication

## Testing Checklist

- [ ] Server is running (`npm run dev`)
- [ ] Mobile app connects to server (check URL in capacitor.config.ts)
- [ ] Can log in from mobile app
- [ ] Flashcards load correctly
- [ ] App blocker permissions work
- [ ] Can block and unblock apps
- [ ] Flashcard completion syncs with server

## Troubleshooting

### "Cannot connect to server"

**Check:**
1. Server is running (`npm run dev`)
2. Firewall allows connections on port 3000
3. IP address is correct
4. Both devices on same network

**Windows Firewall:**
```powershell
# Allow port 3000
netsh advfirewall firewall add rule name="Next.js Dev" dir=in action=allow protocol=TCP localport=3000
```

### "Mixed Content" or "Cleartext not permitted"

Make sure `android:usesCleartextTraffic="true"` is in AndroidManifest.xml

### "App blocker not working"

The app blocker is Android-only and independent of the server. Check:
1. Permissions granted (Usage Stats + Display Over Apps)
2. Monitoring is started
3. Apps are in blocked list

## Network Security

### Development
- Uses HTTP (cleartext) for local development
- Set `cleartextTrafficPermitted="true"`

### Production
- Use HTTPS only
- Update `network_security_config.xml`
- Remove `android:usesCleartextTraffic="true"`

## File Structure

```
Your Setup
│
├── Server (Next.js)
│   ├── Runs on localhost:3000 (dev)
│   ├── Or on your production domain
│   └── Handles API routes + database
│
└── Mobile App (Capacitor)
    ├── WebView points to server URL
    ├── App blocker runs natively
    └── Stores settings locally
```

## Benefits of This Approach

✅ **No API route conversion** - Keep your existing backend  
✅ **Real-time updates** - Changes on server reflect immediately  
✅ **Single codebase** - Same React components everywhere  
✅ **Offline app blocker** - Works without server connection  
✅ **Easy deployment** - Just update server, mobile app stays same  

## Alternative: Static Export with Firebase/Supabase

If you want a fully offline app, you'd need to:
1. Replace API routes with Firebase/Supabase
2. Use static export mode
3. More complex but fully offline capable

For your use case (language learning with database), **client-server is recommended**.

## Quick Commands

```bash
# Development
npm run dev              # Start Next.js server
npm run cap:sync         # Sync to Android
npm run cap:android      # Open Android Studio

# Check your IP (for physical device testing)
ipconfig                 # Windows
ifconfig                 # Mac/Linux
```

## Next Steps

1. Start server: `npm run dev`
2. Update IP in `capacitor.config.ts` if using physical device
3. Run: `npm run cap:android`
4. Test the app!
5. Read `APP_BLOCKER_README.md` for blocker setup
