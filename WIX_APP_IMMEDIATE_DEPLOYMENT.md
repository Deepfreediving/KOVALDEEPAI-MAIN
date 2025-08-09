# Koval AI - Wix App Deployment Guide

## 🎯 IMMEDIATE NEXT STEPS FOR YOUR WIX APP

**Wix App ID:** bb7b8bf3-04ce-4c26-95a3-15ddab9914aa
**Status:** Ready for backend upload and frontend deployment

## 📋 STEP-BY-STEP WIX APP DEPLOYMENT

### Step 1: Upload Backend Files ⚡

In your Wix Code IDE (https://ide.wix-code.com/bb7b8bf3-04ce-4c26-95a3-15ddab9914aa):

1. **Go to Public & Backend > Backend**
2. **Upload these 7 files exactly as named:**

```
chat.jsw              ← Copy from /Wix App/backend/chat.jsw
diveLogs.jsw          ← Copy from /Wix App/backend/diveLogs.jsw
memberProfile.jsw     ← Copy from /Wix App/backend/memberProfile.jsw
userMemory.jsw        ← Copy from /Wix App/backend/userMemory.jsw
wixConnection.jsw     ← Copy from /Wix App/backend/wixConnection.jsw
config.jsw            ← Copy from /Wix App/backend/config.jsw
test.jsw              ← Copy from /Wix App/backend/test.jsw
```

### Step 2: Configure OpenAI API Key 🔑

In `config.jsw`, update your OpenAI API key:

```javascript
export const CONFIG = {
  OPENAI_API_KEY: "your-actual-openai-api-key-here",
  PINECONE_CONFIG: {
    apiKey: "your-pinecone-key-if-needed",
    indexName: "your-index-name",
  },
  // ... rest stays the same
};
```

### Step 3: Add Frontend Code to Your Page 📄

1. **Go to your main page in the Wix Editor**
2. **Open the Code Panel** (</> icon)
3. **Copy the entire contents** of `/Wix App/wix-app-frontend.js`
4. **Paste into your page code**

### Step 4: Add HTML Component for Widget 🎨

1. **Add an HTML Component** to your page
2. **Set the HTML Component ID** to `#koval-ai`
3. **In the HTML Component, add:**

```html
<iframe
  id="koval-ai-embed"
  src="https://kovaldeepai-main.vercel.app/embed?theme=light&embedded=true"
  width="100%"
  height="600px"
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
>
</iframe>
```

### Step 5: Test Your Deployment ✅

After uploading and publishing:

1. **Open Browser Console** (F12)
2. **Look for these success messages:**
   - `🚀 Koval-AI widget initializing...`
   - `✅ Found widget with ID: #koval-ai`
   - `✅ All systems operational`

3. **Test Backend Endpoints:**
   ```javascript
   // Run in browser console to test
   backend
     .chat({ userMessage: "test", userId: "test" })
     .then((result) => console.log("✅ Chat works:", result))
     .catch((error) => console.error("❌ Chat error:", error));
   ```

## 🔧 BACKEND FILE CONTENTS READY TO COPY

### 1. chat.jsw

```javascript
import { ok, badRequest, serverError } from 'wix-http-functions';
import { CONFIG } from './config.jsw';

export async function post_chat(request) {
    try {
        const body = await request.body.json();
        const { userMessage, userId, conversationHistory = [] } = body;

        if (!userMessage) {
            return badRequest({ error: 'Missing userMessage' });
        }

        // OpenAI API call
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${CONFIG.OPENAI_API_KEY}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Koval, a professional freediving instructor and mentor. Provide expert guidance on freediving techniques, safety, and training.'
                    },
                    ...conversationHistory,
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!openaiResponse.ok) {
            throw new Error(\`OpenAI API error: \${openaiResponse.status}\`);
        }

        const result = await openaiResponse.json();

        return ok({
            success: true,
            response: result.choices[0].message.content,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat endpoint error:', error);
        return serverError({
            error: 'Chat service temporarily unavailable',
            details: error.message
        });
    }
}
```

### 2. config.jsw

```javascript
export const CONFIG = {
  OPENAI_API_KEY: "sk-your-openai-api-key-here", // ⚠️ UPDATE THIS!

  PINECONE_CONFIG: {
    apiKey: "your-pinecone-key-if-needed",
    indexName: "your-index-name",
  },

  DEFAULT_SETTINGS: {
    maxTokens: 1000,
    temperature: 0.7,
    model: "gpt-4",
  },

  WIX_CONFIG: {
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
    timeouts: {
      openai: 30000,
      default: 10000,
    },
  },
};
```

## 🚨 CRITICAL CHECKS

### Before Publishing:

- [ ] All 7 `.jsw` files uploaded to Backend
- [ ] OpenAI API key updated in `config.jsw`
- [ ] Frontend code added to page
- [ ] HTML Component added with ID `#koval-ai`

### After Publishing:

- [ ] No console errors
- [ ] Widget loads successfully
- [ ] Chat functionality works
- [ ] User authentication works

## 🔗 YOUR SPECIFIC ENDPOINTS

Once deployed, your endpoints will be:

- `https://your-site.wixsite.com/_functions/chat`
- `https://your-site.wixsite.com/_functions/diveLogs`
- `https://your-site.wixsite.com/_functions/memberProfile`
- `https://your-site.wixsite.com/_functions/userMemory`
- `https://your-site.wixsite.com/_functions/test`

## 📞 TROUBLESHOOTING

### Common Issues:

1. **"Function not found"** → Check file names match exactly (no typos)
2. **"OpenAI error"** → Verify API key in config.jsw
3. **"Widget not loading"** → Check HTML Component ID is `#koval-ai`
4. **Console errors** → Check browser console for specific error messages

### Test Commands:

```javascript
// Test in browser console after deployment
backend
  .test()
  .then((r) => console.log("✅ Backend:", r))
  .catch((e) => console.error("❌ Backend:", e));
```

## 🎉 YOU'RE READY TO DEPLOY!

Your Koval AI system is fully prepared. Simply follow the steps above in your Wix Code IDE and you'll have a fully functional AI freediving assistant!

**Next:** Upload the backend files and add the frontend code to see your AI come to life! 🤿
