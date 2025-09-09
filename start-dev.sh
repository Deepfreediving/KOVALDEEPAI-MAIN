#!/bin/bash

echo "🚀 Starting Koval AI Development Server..."
echo "📍 Working directory: $(pwd)"

# Make sure we're in the right directory
cd /Users/danielkoval/Documents/buildaiagent/KovalDeepAI-main

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if web app node_modules exists
if [ ! -d "apps/web/node_modules" ]; then
    echo "📦 Installing web app dependencies..."
    cd apps/web
    npm install
    cd ../..
fi

echo "🌐 Starting Next.js development server..."
echo "🔗 App will be available at: http://localhost:3000"
echo "⏹️  Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev:web
