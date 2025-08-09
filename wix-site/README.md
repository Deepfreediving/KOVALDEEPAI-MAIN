# Wix Site Code Mirror

**⚠️ MIRROR ONLY - NOT BUILT OR DEPLOYED**

This folder contains a mirror of the Wix site code for:

- GitHub Copilot context
- Code review and development
- Documentation purposes

## Structure

```
/wix-site/
├── wix-app/          # Wix App backend functions & frontend
│   ├── backend/      # .jsw files (backend functions)
│   └── frontend/     # Page code and widgets
├── wix-page/         # Wix Page code
│   └── frontend/     # Page code only (no backend functions)
└── public/           # Public files (bot-widget.js, etc.)
```

## Important Notes

- **This code is NOT executed by Next.js/Vercel**
- **This is a development mirror only**
- **Real code runs in Wix Editor**
- **No secrets or PII committed**

## Wix Deployment

To deploy changes:

1. Copy code from this mirror
2. Paste into Wix Editor
3. Test in Wix Preview
4. Publish in Wix

## Security

- No real API keys committed
- Placeholder values used for secrets
- Member data exports excluded via .gitignore
