# Wix Site Code Mirror - V4.0 Architecture

**⚠️ MIRROR ONLY - NOT BUILT OR DEPLOYED**

This folder contains a mirror of the Wix site code for:

- GitHub Copilot context
- Code review and development
- Documentation purposes

## Structure

```
/wix-site/
├── wix-page/                           # 🔥 Wix Page code (ORGANIZED)
│   ├── wix-frontend-page-simplified.js # ⭐ MASTER FILE (Use this only)
│   ├── data.js                         # Wix data utilities
│   ├── backend/                        # .jsw backend functions
│   ├── deprecated/                     # Legacy files (archived)
│   ├── WIX-PAGE-ORGANIZATION.md        # File organization guide
│   └── WIX-DEPLOYMENT-GUIDE.md         # Deployment instructions
└── public/                             # Public files (bot-widget.js, etc.)
```

## 🎯 PRODUCTION DEPLOYMENT

**ONLY USE:** `wix-page/wix-frontend-page-simplified.js`

This master file includes:

- ✅ V4.0 session management architecture
- ✅ Vercel handshake integration
- ✅ Offline buffering and resilience
- ✅ Robust error handling
- ✅ Clean data flow patterns

**Before deployment:**

1. Update `SESSION_CONFIG.VERCEL_URL` with your actual domain
2. Follow the deployment guide in `WIX-DEPLOYMENT-GUIDE.md`
3. Test thoroughly in Wix Preview mode

## Important Notes

- **This code is NOT executed by Next.js/Vercel**
- **This is a development mirror only**
- **Real code runs in Wix Editor**
- **No secrets or PII committed**

## File Organization

- **Master File:** Production-ready V4.0 architecture
- **Deprecated:** Legacy files archived for reference
- **Backend:** Wix backend functions (.jsw files)
- **Documentation:** Deployment and organization guides

## Wix Deployment

To deploy changes:

1. Copy master file: `wix-frontend-page-simplified.js`
2. Update configuration (Vercel URL, widget IDs)
3. Paste into Wix Editor page code
4. Test in Wix Preview
5. Publish when ready

## Security

- No real API keys committed
- Placeholder values used for secrets
- Member data exports excluded via .gitignore

---

**Architecture Version:** V4.0  
**Master File:** `wix-page/wix-frontend-page-simplified.js`  
**Status:** Production Ready ✅
