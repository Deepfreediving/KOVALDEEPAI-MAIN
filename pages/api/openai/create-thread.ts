// pages/api/openai/create-thread.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import handleCors from "@/utils/cors";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_WnbEd7Jxgf1z2U0ziNWi8yz9';
const WIX_SITE_URL = process.env.WIX_SITE_URL || '';

// ✅ Validate required environment variables
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not configured');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || '' });

type TextContent = {
  type: 'text';
  text: {
    value: string;
    annotations: any[];
  };
};

/**
 * ✅ Enhanced input validation
 */
function validateInput(username: string, displayName: string): { isValid: boolean; error?: string } {
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.length > 100) {
    return { isValid: false, error: 'Username too long (max 100 characters)' };
  }
  
  if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
    return { isValid: false, error: 'Display name is required' };
  }
  
  if (displayName.length > 200) {
    return { isValid: false, error: 'Display name too long (max 200 characters)' };
  }
  
  // Basic safety check for malicious input
  const dangerousPattern = /<script|javascript:|data:|vbscript:/i;
  if (dangerousPattern.test(username) || dangerousPattern.test(displayName)) {
    return { isValid: false, error: 'Invalid characters in input' };
  }
  
  return { isValid: true };
}

/**
 * ✅ Safe fetch with timeout and AbortController
 */
async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KovalAI/1.0'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * ✅ Enhanced Wix logs fetching with better error handling
 */
async function fetchWixDiveLogs(userId: string): Promise<string[]> {
  if (!WIX_SITE_URL || WIX_SITE_URL.includes('your-wix-site') || WIX_SITE_URL.includes('example')) {
    console.warn('⚠️ WIX_SITE_URL not properly configured. Skipping Wix logs fetch.');
    return [];
  }

  // Validate userId to prevent injection
  const sanitizedUserId = encodeURIComponent(userId.trim());
  if (!sanitizedUserId || sanitizedUserId.length > 200) {
    console.warn('⚠️ Invalid userId for Wix fetch');
    return [];
  }

  try {
    const url = `${WIX_SITE_URL}/_functions/userMemory?userId=${sanitizedUserId}`;
    console.log(`🔍 Fetching Wix logs from: ${url}`);
    
    const res = await fetchWithTimeout(url, 8000);

    if (!res.ok) {
      console.warn(`⚠️ Wix fetch failed with status ${res.status}: ${res.statusText}`);
      return [];
    }

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.warn('⚠️ Wix response is not JSON');
      return [];
    }

    const data = await res.json();
    
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ Invalid Wix response format');
      return [];
    }

    if (Array.isArray(data.logs) && data.logs.length > 0) {
      console.log(`✅ Retrieved ${data.logs.length} Wix dive logs`);
      return data.logs
        .filter((log: any) => log && typeof log === 'object')
        .slice(0, 5)
        .map((log: Record<string, unknown>) => JSON.stringify(log));
    }
    
    console.log('ℹ️ No dive logs found in Wix response');
    return [];
    
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to fetch Wix logs:', msg);
    return [];
  }
}

/**
 * ✅ Enhanced polling with proper cleanup and cancellation
 */
async function pollRunCompletion(
  threadId: string, 
  runId: string, 
  maxRetries = 25,
  signal?: AbortSignal
): Promise<{ success: boolean; error?: string }> {
  let retries = 0;
  let delay = 1000;

  while (retries < maxRetries) {
    // Check if request was cancelled
    if (signal?.aborted) {
      return { success: false, error: 'Request cancelled' };
    }

    // Wait with cancellation support
    await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, delay);
      signal?.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Request cancelled'));
      });
    }).catch(() => {
      return { success: false, error: 'Request cancelled' };
    });

    try {
      const updatedRun = await openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });

      console.log(`📊 Run status (attempt ${retries + 1}): ${updatedRun.status}`);

      if (updatedRun.status === 'completed') {
        console.log('✅ Assistant run completed successfully');
        return { success: true };
      }

      if (updatedRun.status === 'failed') {
        const errorMsg = updatedRun.last_error?.message || 'Run failed';
        console.error(`❌ Run failed:`, updatedRun.last_error);
        return { success: false, error: errorMsg };
      }

      if (updatedRun.status === 'cancelled') {
        console.warn('⚠️ Run was cancelled');
        return { success: false, error: 'Run was cancelled' };
      }

      if (updatedRun.status === 'expired') {
        console.warn('⚠️ Run expired');
        return { success: false, error: 'Run expired' };
      }
      
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️ Polling error (attempt ${retries + 1}):`, msg);
      
      // Stop polling on authentication errors
      if (msg.includes('401') || msg.includes('403')) {
        return { success: false, error: 'Authentication error' };
      }
      
      // Stop polling on invalid thread/run errors
      if (msg.includes('404') || msg.includes('invalid')) {
        return { success: false, error: 'Invalid thread or run ID' };
      }
    }

    retries++;
    delay = Math.min(delay * 1.2, 6000); // Gradual increase, max 6 seconds
  }

  console.warn(`⚠️ Run polling timed out after ${maxRetries} attempts`);
  return { success: false, error: 'Polling timeout - run may still be processing' };
}

/**
 * ✅ Enhanced API handler with proper error handling
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  
  try {
    // CORS handling
    if (await handleCors(req, res)) return;
    
    // Method validation
    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method Not Allowed',
        message: 'Only POST requests are allowed'
      });
    }

    // Extract and validate input
    const { 
      username = '', 
      displayName = '',
      timestamp // For request deduplication
    } = req.body;

    const trimmedUsername = username.toString().trim();
    const trimmedDisplayName = displayName.toString().trim();

    // Input validation
    const validation = validateInput(trimmedUsername, trimmedDisplayName);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Validation Error',
        message: validation.error
      });
    }

    // Check if OpenAI is configured
    if (!OPENAI_API_KEY) {
      console.warn('⚠️ Missing OpenAI API Key — returning mock data');
      return res.status(200).json({
        threadId: `mock-${Date.now()}`,
        initialMessage: `👋 Hello ${trimmedDisplayName}, I'm your freediving AI coach. (Demo Mode)`,
        metadata: { 
          mock: true, 
          processingTime: Date.now() - startTime 
        }
      });
    }

    console.log(`🚀 Creating thread for user: ${trimmedUsername} (${trimmedDisplayName})`);

    // 1️⃣ Create a new conversation thread
    const thread = await openai.beta.threads.create({
      metadata: { 
        createdBy: trimmedUsername, 
        displayName: trimmedDisplayName,
        createdAt: new Date().toISOString(),
        source: 'api'
      },
    });

    console.log(`✅ Thread created: ${thread.id}`);

    // 2️⃣ Fetch Wix logs with timeout
    let wixLogs: string[] = [];
    try {
      wixLogs = await Promise.race([
        fetchWixDiveLogs(trimmedUsername),
        new Promise<string[]>((_, reject) => 
          setTimeout(() => reject(new Error('Wix fetch timeout')), 10000)
        )
      ]);
    } catch (wixError) {
      console.warn('⚠️ Wix logs fetch failed, continuing without logs:', 
        wixError instanceof Error ? wixError.message : String(wixError)
      );
    }

    // 3️⃣ Add dive logs to thread (if any)
    if (wixLogs.length > 0) {
      console.log(`📝 Adding ${wixLogs.length} dive logs to thread`);
      
      for (const [index, log] of wixLogs.entries()) {
        try {
          await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: `Previous dive log ${index + 1}:\n${log}`,
            metadata: { 
              type: 'priorLog', 
              userId: trimmedUsername,
              logIndex: index.toString()
            },
          });
        } catch (logError) {
          console.warn(`⚠️ Failed to add log ${index + 1}:`, 
            logError instanceof Error ? logError.message : String(logError)
          );
        }
      }
    }

    // 4️⃣ Add initial greeting message
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `Hi, I'm ${trimmedDisplayName}. I'm ready to start our freediving coaching session.`,
      metadata: { type: 'greeting', userId: trimmedUsername }
    });

    // 5️⃣ Start assistant run
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
      metadata: { 
        createdFor: trimmedUsername,
        sessionStart: new Date().toISOString()
      }
    });

    console.log(`🤖 Started assistant run: ${run.id}`);

    // 6️⃣ Poll for completion with timeout support
    const controller = new AbortController();
    const pollTimeout = setTimeout(() => controller.abort(), 30000); // 30 second total timeout

    const pollResult = await pollRunCompletion(thread.id, run.id, 25, controller.signal);
    clearTimeout(pollTimeout);

    if (!pollResult.success) {
      throw new Error(pollResult.error || 'Run polling failed');
    }

    // 7️⃣ Retrieve assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id, {
      limit: 10 // Get recent messages
    });
    
    const assistantMessages = messages.data.filter((m) => m.role === 'assistant');

    if (assistantMessages.length === 0) {
      throw new Error('No assistant response found');
    }

    const latestAssistantMessage = assistantMessages[0];
    const textBlock = latestAssistantMessage.content.find(
      (c): c is TextContent => c.type === 'text' && !!c.text?.value
    );

    const initialMessage = textBlock?.text?.value || 
      `👋 Hello ${trimmedDisplayName}! I'm Koval AI, your freediving coach. Let's begin!`;

    const processingTime = Date.now() - startTime;
    console.log(`✅ Thread creation completed in ${processingTime}ms`);

    return res.status(200).json({
      threadId: thread.id,
      initialMessage,
      metadata: {
        processingTime,
        wixLogsCount: wixLogs.length,
        assistantId: ASSISTANT_ID,
        success: true
      }
    });

  } catch (err: unknown) {
    const processingTime = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : 'Unknown error occurred';
    
    console.error('❌ Thread creation error:', {
      error: msg,
      processingTime,
      timestamp: new Date().toISOString()
    });

    // Determine appropriate status code
    let statusCode = 500;
    if (msg.includes('Authentication') || msg.includes('401')) statusCode = 401;
    if (msg.includes('Rate limit') || msg.includes('429')) statusCode = 429;
    if (msg.includes('Validation') || msg.includes('400')) statusCode = 400;

    return res.status(statusCode).json({ 
      error: 'Thread Creation Failed',
      message: msg,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
        success: false
      }
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '5mb' },
    responseLimit: false,
    externalResolver: true
  }
};
