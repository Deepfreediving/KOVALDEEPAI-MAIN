# 🤿 Koval Deep AI - Freediving Coach

## Overview

Koval Deep AI is a sophisticated Next.js application that functions as an AI-powered freediving coach, providing personalized coaching based on dive logs and user data.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
├── components/          # React components
├── pages/              # Next.js pages and API routes
├── lib/                # Utility libraries
├── data/               # Knowledge base and dive logs
├── utils/              # Helper utilities
├── styles/             # CSS and styling
├── types/              # TypeScript type definitions
├── wix-site/           # Wix integration files
├── archive/            # Archived files and documentation
│   ├── documentation/  # Project documentation
│   ├── test-scripts/   # Test and debug scripts
│   └── deprecated-files/ # Legacy files
└── docs/               # Current documentation
```

## 🔧 Key Features

- **AI Freediving Coach**: Personalized coaching using OpenAI GPT
- **Dive Log Management**: Save, analyze, and track freediving progress
- **Wix Integration**: Seamless integration with Wix website
- **Vector Search**: Pinecone-powered knowledge base
- **Image Analysis**: OCR and AI analysis of dive computer screenshots
- **Responsive Design**: Works on desktop and mobile

## 🛠️ Tech Stack

- **Framework**: Next.js 14.2.5
- **Runtime**: Node.js 18+
- **AI**: OpenAI GPT API
- **Database**: Pinecone vector database + Wix collections
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety
- **Deployment**: Vercel

## 🌐 Deployment

- **Production URL**: https://kovaldeepai-main.vercel.app
- **Embedded Version**: `/embed` route for iframe integration

## 📊 Environment Variables

See `.env.development.template` for required environment variables:

- OpenAI API keys
- Pinecone configuration
- Wix integration tokens

## 🧪 Testing

Test scripts are located in `archive/test-scripts/` for debugging and verification.

## 📚 Documentation

Historical documentation is available in `archive/documentation/` including:

- Implementation guides
- Bug fix reports
- Integration instructions

---

**Built with ❤️ for the freediving community**
