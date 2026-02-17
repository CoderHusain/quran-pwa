# PWA Setup - Quran Read Tracker

## ✅ Completed Setup

### 1. **Favicon**
- ✓ favicon.ico (32x32)
- ✓ favicon-16x16.png
- ✓ favicon-32x32.png
- All favicon links added to `index.html`

### 2. **PWA Icons**
- ✓ icon-192.png (192x192) - Required for PWA
- ✓ icon-512.png (512x512) - Required for PWA
- ✓ Both icons configured with `any` and `maskable` purposes
- ✓ Manifest configured in `vite.config.js`

### 3. **Apple Touch Icon**
- ✓ apple-touch-icon.png (180x180)
- ✓ Added to `index.html` with proper meta tags

### 4. **iOS Splash Screens**
Created splash screens for various iOS devices:
- ✓ iPhone 12/13/14 Pro Max (1284x2778)
- ✓ iPhone 12/13/14 Pro (1170x2532)
- ✓ iPhone X/XS/11 Pro (1125x2436)
- ✓ iPad Pro 12.9" (1536x2048)
- ✓ iPad Pro 11" (1668x2388)
- ✓ iPad landscape (2048x1536)

### 5. **PWA Configuration**
```javascript
{
  name: 'Quran Read Tracker',
  short_name: 'Quran Tracker',
  theme_color: '#2e7d32', // Islamic green
  background_color: '#ffffff',
  display: 'standalone',
  orientation: 'portrait'
}
```

## 📱 Testing

### On Desktop
1. Run `npm run dev`
2. Open browser and check the favicon in the tab
3. Check browser DevTools → Application → Manifest

### On iOS (Safari)
1. Deploy to production or use ngrok/similar for HTTPS
2. Open in Safari
3. Tap Share button → "Add to Home Screen"
4. Check that:
   - Icon appears correctly on home screen
   - App opens in standalone mode (no browser UI)
   - Splash screen shows when launching

### On Android (Chrome)
1. Deploy to production or use HTTPS
2. Open in Chrome
3. Chrome will show "Add to Home Screen" prompt
4. Install and verify icon and splash screen

## 🚀 Deployment

All icon files are in the `public/` folder and will be automatically copied to `dist/` during build.

When deploying:
```bash
npm run build
```

The PWA will be automatically configured with:
- Service worker for offline support
- All icons and splash screens
- Proper manifest file

## 📝 Files Modified

1. `index.html` - Added favicon, apple-touch-icon, and splash screen links
2. `vite.config.js` - Updated PWA manifest configuration
3. `public/` - Added all icon and splash screen files

## 🎨 Icon Source

Original icon: Quran book image with green cover and Arabic calligraphy
- Theme color: `#2e7d32` (matches the green from the icon)

## 📚 References

- [PWA Icons Guide](https://web.dev/add-manifest/)
- [iOS Splash Screens](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
