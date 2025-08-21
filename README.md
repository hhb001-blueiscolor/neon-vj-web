# NeoN VJ Web - Live Setlist Sharing

Real-time setlist sharing for NeoN VJ app users. This service allows DJs to publish their live music recognition data to shareable web pages.

## 🎵 Features

- **Real-time Updates**: Setlists update automatically as music is recognized
- **DJ Tracking**: See which DJ is playing each track
- **Multiple Display Modes**: Chronological or grouped by DJ
- **Auto-cleanup**: Events automatically deleted after 30 days
- **Mobile Friendly**: Responsive design for all devices

## 🌐 Usage

### For DJs (NeoN VJ App Users)
1. Open NeoN VJ app settings
2. Enable "Setlist Web Publishing"
3. Configure your event name and settings
4. Start publishing to get a shareable URL
5. Share the URL with your audience

### For Audience
1. Visit the shared URL or enter event ID at the homepage
2. View real-time track updates
3. Filter by DJ if multiple DJs are performing
4. Share the page with others

## 🔧 Technical Details

- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **Data Storage**: JSON files via GitHub API
- **Auto-cleanup**: GitHub Actions daily maintenance
- **Update Frequency**: 30-second polling interval

## 📁 Structure

```
├── data/events/         # JSON event data files
├── index.html          # Landing page
├── live.html           # Real-time setlist display
├── cleanup.js          # 30-day cleanup script
└── .github/workflows/  # GitHub Actions configuration
```

## 🛡️ Privacy & Data

- Events are automatically deleted after 30 days
- No personal information is stored beyond DJ names
- All data is publicly accessible during the 30-day period
- See main privacy policy at [neondjneon.com](https://neondjneon.com)

## 📱 Powered by NeoN VJ

This service is powered by [NeoN VJ](https://apps.apple.com/app/neon-vj), a professional VJ app for iOS/iPadOS featuring:
- Advanced music recognition via ShazamKit
- Real-time visual effects and layouts
- External monitor support
- Google Sheets integration

© 2025 SMYLE | Produced by NeoN
