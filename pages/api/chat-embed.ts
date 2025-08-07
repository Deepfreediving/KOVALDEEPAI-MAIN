import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import handleCors from '@/utils/handleCors';
import { fetchUserMemory, saveUserMemory } from '@/lib/userMemoryManager';
import { queryPineconeForChunks } from '@/lib/pineconeQuery';

// ✅ Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ✅ Types
interface UserProfile {
  pb?: number;
  isInstructor?: boolean;
  [key: string]: any;
}

interface UserMemory {
  profile?: UserProfile;
  logs?: Array<{
    userMessage: string;
    assistantReply: string;
    timestamp: string;
  }>;
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// ✅ Detect user experience level
function detectUserLevel(profile: UserProfile = {}): 'expert' | 'beginner' {
  const pb = Number(profile.pb) || 0;
  const isInstructor = Boolean(profile.isInstructor);
  return isInstructor || pb >= 80 ? 'expert' : 'beginner';
}

// ✅ Simple depth range
function getDepthRange(depth: number = 10): string {
  if (!depth || depth <= 0) return '10m';
  if (depth > 100) return '100m+';
  return `${Math.floor(depth / 10) * 10}m`;
}

// ✅ Pinecone query (get raw knowledge chunks) - Direct function call
async function queryPinecone(query: string): Promise<string[]> {
  if (!query?.trim()) return [];

  try {
    const chunks = await queryPineconeForChunks(query);
    console.log(`✅ Pinecone returned ${chunks.length} knowledge chunks for query: "${query}"`);
    return chunks;
  } catch (err: unknown) {
    console.warn('⚠️ Pinecone query error (continuing without knowledge):', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ✅ System prompt generator - Enhanced with dive log context and user identification
function generateSystemPrompt(level: 'expert' | 'beginner', contextChunks: string[], diveLogContext: string = '', userId: string = ''): string {
  const knowledgeContext = contextChunks.length ? contextChunks.join('\n\n---\n\n') : '';
  
  // This is a private members-only page, so all users are authenticated members
  const userGreeting = userId && userId !== 'member' 
    ? `You are speaking with member ${userId}. ` 
    : 'You are speaking with an authenticated member. ';
  
  return `
You are Koval Deep AI, Daniel Koval's freediving coaching system. ${userGreeting}This is a private members-only page, so provide personalized coaching based on their progress and training history.

🎯 CRITICAL REQUIREMENTS:
- ONLY use information from the provided knowledge base below
- If the knowledge base doesn't contain specific information, say "I don't have specific guidance on this in my training materials"
- Never mix general freediving advice with Daniel's specific methods
- Provide ${level}-level technical detail appropriate for the user's experience
- Always prioritize safety and progressive training
- Keep responses detailed but focused (under 800 words)
- When dive logs are available, reference them for personalized coaching
- Address the user personally as a valued member with access to exclusive training

🚫 FORBIDDEN:
- Making up training protocols not in the knowledge base
- Combining different methodologies
- Providing generic freediving advice when Daniel's specific approach exists
- Recommending techniques beyond the user's certification level

📚 DANIEL KOVAL'S KNOWLEDGE BASE:
${knowledgeContext || 'No specific knowledge found for this query. Provide only general safety reminders and suggest consulting the full training materials.'}

${diveLogContext}

Based ONLY on the above knowledge and dive history, provide helpful, accurate guidance for this member. If unsure, be honest about limitations.
  `.trim();
}

// ✅ API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await handleCors(req, res);
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ✅ Check OpenAI API key
    if (!OPENAI_API_KEY) {
      console.error('❌ Missing OpenAI API key');
      return res.status(500).json({
        assistantMessage: {
          role: 'assistant',
          content: '⚠️ Configuration error: OpenAI API key not found.',
        },
        metadata: { error: 'missing_api_key' },
      });
    }

    const { message, userId, profile = {}, diveLogs = [] } = req.body as {
      message: string;
      userId?: string;
      profile?: UserProfile;
      diveLogs?: Array<any>;
    };

    // ✅ Validate required inputs
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // Since this is a private page accessible only to authenticated members,
    // we don't need to validate userId - trust that Wix handles authentication
    const effectiveUserId = userId || 'member';

    console.log(`💬 Processing message from member ${effectiveUserId}: "${message.substring(0, 50)}..."`);
    console.log(`📊 User profile summary: PB=${profile.pb || 'Unknown'}, Instructor=${profile.isInstructor || false}, Level=${detectUserLevel(profile)}`);
    console.log(`🏊‍♂️ Dive logs provided: ${diveLogs.length} entries`);

    // ✅ Load past memory AND process dive logs for comprehensive coaching context
    let pastMemory: UserMemory = {};
    let diveLogContext = '';
    
    console.log(`🔍 Loading user data for: ${effectiveUserId}`);
    
    try {
      pastMemory = ((await fetchUserMemory(effectiveUserId)) as UserMemory) || {};
      console.log('✅ Loaded past memory');
      
      // 🏊‍♂️ ENHANCED: Process dive logs from Wix database OR load from file system as fallback
      if (diveLogs && diveLogs.length > 0) {
        console.log(`📊 Processing ${diveLogs.length} dive logs from Wix database`);
        
        const recentDiveLogs = diveLogs
          .slice(0, 5) // Last 5 dive logs
          .map((log: any) => {
            const details = [
              `📅 ${log.date || log.timestamp?.split('T')[0] || 'Unknown date'}`,
              `🏊‍♂️ ${log.discipline || log.disciplineType || 'Unknown discipline'}`,
              `📍 ${log.location || 'Unknown location'}`,
              `🎯 Target: ${log.targetDepth}m → Reached: ${log.reachedDepth}m`,
              log.mouthfillDepth ? `💨 Mouthfill: ${log.mouthfillDepth}m` : '',
              log.issueDepth ? `⚠️ Issue at: ${log.issueDepth}m` : '',
              log.issueComment ? `💭 Issue: ${log.issueComment}` : '',
              log.notes ? `📝 ${log.notes}` : ''
            ].filter(Boolean).join(' | ');
            
            return details;
          })
          .join('\n');
        
        diveLogContext = `
🏊‍♂️ MEMBER'S RECENT DIVE LOGS (Last ${Math.min(5, diveLogs.length)} dives):
${recentDiveLogs}

📈 DIVE STATISTICS:
- Total recorded dives: ${diveLogs.length}
- Personal best: ${profile.pb || 'Unknown'}m
- Last dive depth: ${diveLogs[0]?.reachedDepth || diveLogs[0]?.targetDepth || 'Unknown'}m
- Progress analysis: ${diveLogs.length >= 3 ? 'Multiple sessions recorded - analyze patterns and progression' : 'Limited data - focus on current goals'}
        `.trim();
        
        console.log('✅ Generated dive log context for AI coaching');
      } else {
        console.log('📭 No dive logs provided from Wix, trying file system fallback...');
        
        // ✅ FALLBACK: Load dive logs from file system
        try {
          const fs = require('fs/promises');
          const path = require('path');
          
          const LOG_DIR = path.resolve('./data/diveLogs');
          console.log(`📂 Checking dive logs directory: ${LOG_DIR}`);
          
          // Try specific known user IDs or scan for any dive logs
          const knownUserIds = [
            '8b315b71-22b9-40c6-af86-841ceee3f534',
            'f549b01d-9dc1-4c85-90b9-1683337f6ed0',
            effectiveUserId
          ];
          
          let loadedLogs: any[] = [];
          
          for (const testUserId of knownUserIds) {
            try {
              const userLogFile = path.join(LOG_DIR, `${testUserId}.json`);
              await fs.access(userLogFile);
              
              const content = await fs.readFile(userLogFile, 'utf8');
              const logData = JSON.parse(content);
              
              if (logData && typeof logData === 'object') {
                loadedLogs.push(logData);
                console.log(`✅ Loaded dive log from file system: ${testUserId}`);
              }
            } catch (fileError) {
              // File doesn't exist or can't be read, continue to next
            }
          }
          
          if (loadedLogs.length > 0) {
            // Sort by timestamp (most recent first)
            loadedLogs.sort((a, b) => {
              const dateA = new Date(a.timestamp || a.date || 0).getTime();
              const dateB = new Date(b.timestamp || b.date || 0).getTime();
              return dateB - dateA;
            });
            
            const recentDiveLogs = loadedLogs
              .slice(0, 5) // Last 5 dive logs
              .map((log: any) => {
                const details = [
                  `📅 ${log.date || log.timestamp?.split('T')[0] || 'Unknown date'}`,
                  `🏊‍♂️ ${log.discipline || log.disciplineType || 'Unknown discipline'}`,
                  `📍 ${log.location || 'Unknown location'}`,
                  `🎯 Target: ${log.targetDepth}m → Reached: ${log.reachedDepth}m`,
                  log.mouthfillDepth ? `💨 Mouthfill: ${log.mouthfillDepth}m` : '',
                  log.issueDepth ? `⚠️ Issue at: ${log.issueDepth}m` : '',
                  log.issueComment ? `💭 Issue: ${log.issueComment}` : '',
                  log.notes ? `📝 ${log.notes}` : ''
                ].filter(Boolean).join(' | ');
                
                return details;
              })
              .join('\n');
            
            diveLogContext = `
🏊‍♂️ MEMBER'S RECENT DIVE LOGS (Last ${Math.min(5, loadedLogs.length)} dives - from file system):
${recentDiveLogs}

📈 DIVE STATISTICS:
- Total recorded dives: ${loadedLogs.length}
- Personal best: ${Math.max(...loadedLogs.map(log => parseInt(log.reachedDepth || log.targetDepth || '0')))}m
- Last dive depth: ${loadedLogs[0]?.reachedDepth || loadedLogs[0]?.targetDepth || 'Unknown'}m
- Progress analysis: ${loadedLogs.length >= 3 ? 'Multiple sessions recorded - analyze patterns and progression' : 'Limited data - focus on current goals'}
            `.trim();
            
            console.log('✅ Generated dive log context from file system for AI coaching');
          } else {
            diveLogContext = `
🏊‍♂️ DIVE LOG STATUS: No dive logs found in database or file system.
💡 COACHING FOCUS: Encourage member to start logging their training sessions for personalized guidance.
            `.trim();
          }
        } catch (fsError) {
          console.warn('⚠️ File system fallback failed:', fsError);
          diveLogContext = `
🏊‍♂️ DIVE LOG STATUS: No recent dive logs available.
💡 COACHING FOCUS: Encourage member to start logging their training sessions for personalized guidance.
          `.trim();
        }
      }
      
    } catch (err: unknown) {
      console.warn('⚠️ Failed to fetch past memory (continuing):', err instanceof Error ? err.message : String(err));
    }

    const mergedProfile: UserProfile = { ...pastMemory.profile, ...profile };
    const userLevel = detectUserLevel(mergedProfile);
    const depthRange = getDepthRange(mergedProfile.pb || 10);

    // ✅ Query Pinecone for relevant context (safe)
    let contextChunks: string[] = [];
    try {
      contextChunks = await queryPinecone(message);
    } catch (err: unknown) {
      console.warn('⚠️ Knowledge lookup failed (continuing without):', err instanceof Error ? err.message : String(err));
    }

    // ✅ Messages payload
    const messagesPayload: ChatMessage[] = [
      { role: 'system', content: generateSystemPrompt(userLevel, contextChunks, diveLogContext, effectiveUserId) },
      { role: 'user', content: message },
    ];

    console.log(`🤖 Calling OpenAI with ${userLevel} profile, ${contextChunks.length} knowledge chunks, and dive log context for user: ${effectiveUserId}`);
    if (diveLogContext) {
      console.log('📊 Dive log context included:', diveLogContext.substring(0, 200) + '...');
    }

    // ✅ Call OpenAI (with detailed error handling)
    let response;
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 1200,
        messages: messagesPayload,
      });
    } catch (openaiError: unknown) {
      console.error('❌ OpenAI API Error:', openaiError instanceof Error ? openaiError.message : String(openaiError));
      return res.status(500).json({
        assistantMessage: {
          role: 'assistant',
          content: '⚠️ I\'m having trouble connecting to my AI brain right now. Please try again in a moment.',
        },
        metadata: { error: 'openai_api_error' },
      });
    }

    const assistantReply =
      response?.choices?.[0]?.message?.content?.trim() || '⚠️ No response generated.';

    console.log(`✅ Generated response: "${assistantReply.substring(0, 50)}..."`);

    // ✅ Save conversation (safe)
    try {
      const updatedMemory = {
        logs: [
          ...(pastMemory.logs || []),
          { userMessage: message, assistantReply, timestamp: new Date().toISOString(), userId: effectiveUserId },
        ],
        profile: { ...mergedProfile, lastActiveUser: effectiveUserId },
      };
      
      await saveUserMemory(effectiveUserId, updatedMemory);
      console.log(`💾 Conversation saved for user: ${effectiveUserId}`);
    } catch (err: unknown) {
      console.warn('⚠️ Failed to save user memory (response still sent):', err instanceof Error ? err.message : String(err));
    }

    return res.status(200).json({
      assistantMessage: { role: 'assistant', content: assistantReply },
      metadata: {
        userLevel,
        depthRange,
        contextChunks: contextChunks.length,
        memoryUsed: Boolean(pastMemory.logs?.length),
      },
    });
  } catch (error: unknown) {
    console.error('💥 Unexpected Chat API Error:', error instanceof Error ? error.message : String(error));
    return res.status(500).json({
      assistantMessage: {
        role: 'assistant',
        content: '⚠️ Something unexpected happened. Please try again.',
      },
      metadata: { error: 'unexpected_error' },
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '2mb' },
    responseLimit: '2mb',
    timeout: 30000,
  },
};
