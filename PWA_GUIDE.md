# Progressive Web App (PWA) Implementation

## Overview
The Smart Employee Self-Service Portal is now a Progressive Web App (PWA), enabling:
- **Installation** on mobile and desktop devices
- **Offline functionality** with intelligent caching
- **Native app-like experience** with home screen access
- **Fast performance** through service worker optimization

---

## Installation

### On Android/Chrome
1. Open Smart ESS Portal in Chrome
2. Tap the **Menu** (three dots) at the top-right
3. Select **"Install app"** or **"Add to Home screen"**
4. Confirm the installation
5. The app will appear on your home screen as a native app

### On iOS/Safari
1. Open Smart ESS Portal in Safari
2. Tap **Share** button (square with arrow)
3. Scroll and select **"Add to Home Screen"**
4. Name the shortcut (default: "Smart ESS")
5. Tap **Add** to install

### On Desktop (Windows/Mac/Linux)
1. Open Smart ESS Portal in Chrome, Edge, or Firefox
2. Click the **Install** icon in the address bar
3. Confirm the installation
4. The app will appear in your applications menu

---

## Features

### 1. **Offline Support**
The app intelligently caches content based on usage patterns:

- **API Responses**: Cached for 5 minutes with network-first strategy
  - Falls back to cached data if offline
  - Automatically refreshes when online
  
- **Static Assets**: CSS, JavaScript cached permanently
  - Loads instantly on repeat visits
  
- **User Uploads**: Images and documents cached for 30 days
  - Reduces bandwidth usage
  - Faster loading for frequently accessed files

### 2. **Smart Caching Strategies**

#### Network-First (API & HTTPS)
- Tries to fetch from network first
- Falls back to cache if offline or network fails
- Best for: API calls, real-time data, authentication

#### Cache-First (Uploads & Documents)
- Uses cache first for instant loading
- Fetches fresh copy if cache is stale
- Best for: Static documents, user uploads

### 3. **Installation Benefits**
- Add to home screen on any device
- Standalone window (no browser UI)
- Fast launch time
- Custom app icon and theme color
- Native-like push notification support (future enhancement)

---

## How to Use Offline

### Available Offline
Once installed, the following actions work without internet:
- View cached employee profiles
- Review cached attendance records
- Read cached documents
- Access previously loaded leave requests
- View cached notifications

### Sync on Reconnect
When you reconnect to the internet:
1. The app automatically checks for updates
2. Fresh data is fetched and cached
3. Changes sync to the server
4. No manual action needed

### Current Limitations
The following actions require internet connection:
- Login (first time or after session expiry)
- Submitting new requests (attendance check-in/out, leave applications)
- Approving/rejecting requests (manager/admin functions)
- Real-time notifications

---

## Technical Details

### Service Worker
- **File**: `dist/sw.js` (generated during build)
- **Cache Version**: Automatically updated on app deploy
- **Scope**: Application root (`/`)
- **Lifespan**: Persists until cache is cleared

### Manifest
- **File**: `dist/manifest.webmanifest`
- **Contains**: App name, icons, colors, display mode
- **Refresh**: Updated each build

### Caching Strategy
```
HTTPS Resources (https://...)
└─ Network-First
   ├─ Max 200 entries
   └─ 7-day cache duration

API Calls (/api/...)
└─ Network-First with 5-second timeout
   ├─ Max 100 entries
   └─ 5-minute cache duration

User Uploads (/uploads/...)
└─ Cache-First
   ├─ Max 50 entries
   └─ 30-day cache duration
```

### App Icons
- **Source**: `public/logo.svg`
- **Sizes**: 192px (app tile), 512px (splash screen)
- **Format**: SVG (scales to any size)
- **Theme**: Blue (#2f5ef7) background with white ESS text

---

## Updating the PWA

### Automatic Updates
- Service worker checks for updates on every app load
- New version installed automatically
- User is notified of app update (if you add update UI)

### Manual Cache Clear (Advanced)
If you encounter cache issues:

**Chrome/Edge:**
1. Settings → Privacy and security → Clear browsing data
2. Select "Cookies and other site data"
3. Select "Cached images and files"
4. Click Clear data

**Safari (iOS):**
1. Settings → Safari → Clear History and Website Data
2. Also uninstall and reinstall the app

---

## iOS-Specific Notes

### Web App Clips
iOS PWAs are technically web app clips:
- Stored in Safari's managed list
- Added to home screen via share menu
- Limited to 200MB offline content
- Maximum 10 app clips per device

### Limitations on iOS
- No background sync (Apple restriction)
- Limited notifications
- Single window approach
- No access to device sensors beyond camera/location

---

## Browser Support

| Browser | Desktop | Mobile | Support |
|---------|---------|--------|---------|
| Chrome | ✅ | ✅ | Full PWA support |
| Edge | ✅ | ✅ | Full PWA support |
| Firefox | ✅ | ✅ | Full PWA support |
| Safari | ✅ | ✅ | Web app clip only |
| Opera | ✅ | ✅ | Full PWA support |

---

## Future Enhancements

1. **Push Notifications**
   - Backend support for notification delivery
   - User permission management
   - Real-time alerts for approvals/updates

2. **Background Sync**
   - Queue actions when offline
   - Sync when connection restored
   - Progress indicators

3. **Improved Offline UI**
   - "You're offline" banner
   - Sync status indicator
   - Retry mechanisms

4. **App Updates**
   - In-app update prompt
   - Progress bar for new version download
   - Stale-while-revalidate strategies

---

## Troubleshooting

### App won't install
- Ensure HTTPS is enabled (required for PWA)
- Check browser supports PWA (Chrome, Edge, Firefox, Opera)
- Clear browser cache and try again

### Offline features not working
- Verify service worker is active: DevTools → Application → Service Workers
- Check cache storage limits
- Ensure cached routes match API endpoints

### Notifications not appearing
- Grant notification permission when prompted
- Check browser notification settings
- Verify backend VAPID configuration (future)

---

## Development

### Build PWA
```bash
cd frontend
npm run build
```

Generated files:
- `dist/sw.js` - Service worker
- `dist/manifest.webmanifest` - Web app manifest
- `dist/registerSW.js` - Service worker registration

### Local Testing
```bash
cd frontend
npm run dev  # Dev server at http://localhost:5173
```

### Chrome DevTools
- Open DevTools (F12)
- Go to Application tab
- Check Service Workers, Cache Storage, Manifest

---

## Support

For PWA issues:
1. Clear cache and reinstall app
2. Check browser console for errors
3. Verify manifest loads: DevTools → Network → manifest.webmanifest
4. Check service worker registration: DevTools → Application → Service Workers
5. Contact support with error details

