// pages/api/analyze/save-session.ts

import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from '@supabase/supabase-js';
import handleCors from "@/utils/handleCors";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SessionData {
  user_id: string;
  session_name: string;
  messages: ChatMessage[];
  timestamp: string;
  metadata: {
    intent_label: string;
    session_type: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // ✅ Use handleCors
    if (handleCors(req, res)) return; // Early exit for OPTIONS

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ Verify authentication with Supabase JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Missing Supabase configuration" });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    const { sessionName, profile, eqState, messages, timestamp } = req.body;

    // ✅ Validate inputs
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing or invalid messages array." });
    }

    // ✅ Enhanced session saving with coaching context
    console.log("📋 Session save request - enhanced coaching context for user:", user.id);
    
    const sessionId = `coaching-${user.id}-${Date.now()}`;
    const results: { logEntry: string; status: string; insights?: any }[] = [];

    // ✅ Analyze session for coaching insights before saving
    const sessionInsights = await analyzeCoachingSession(messages, user.id);

    // ✅ Process messages and save to user_memory with coaching context
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i] as ChatMessage;

      if (msg.role === "user" && msg.content?.trim()) {
        const nextMsg = messages[i + 1] as ChatMessage | undefined;
        const assistantReply =
          nextMsg?.role === "assistant" && nextMsg.content?.trim()
            ? nextMsg.content
            : "⚠️ No assistant response recorded";

        // ✅ Enhanced memory entry with coaching insights
        const memoryEntry = {
          user_id: user.id,
          memory_type: 'coaching_session' as const,
          content: {
            user_message: msg.content,
            assistant_reply: assistantReply,
            session_id: sessionId,
            session_name: sessionName || `Coaching Session – ${new Date().toLocaleString()}`,
            timestamp: timestamp || new Date().toISOString(),
            coaching_insights: sessionInsights,
            metadata: {
              intent_label: "coaching-save",
              session_type: "coaching",
              eq_state: eqState,
              profile,
              learning_points: extractLearningPoints(msg.content, assistantReply),
              topics_covered: extractTopics(msg.content),
              follow_up_needed: identifyFollowUpNeeds(assistantReply)
            }
          }
        };

        try {
          const { error: insertError } = await supabase
            .from('user_memory')
            .insert(memoryEntry);

          if (insertError) {
            console.error('Failed to save coaching memory entry:', insertError);
            results.push({ logEntry: msg.content, status: "error" });
          } else {
            console.log(`📝 Saved coaching session: ${msg.content.substring(0, 50)}...`);
            results.push({ 
              logEntry: msg.content, 
              status: "saved",
              insights: sessionInsights 
            });
          }
        } catch (error) {
          console.error('Error saving coaching memory entry:', error);
          results.push({ logEntry: msg.content, status: "error" });
        }
      }
    }

    // ✅ Save session summary for future coaching reference
    await saveCoachingSessionSummary(supabase, user.id, sessionId, sessionInsights, messages.length);

    return res.status(200).json({ 
      success: true, 
      saved: results,
      user_id: user.id,
      session_id: sessionId,
      coaching_insights: sessionInsights
    });
  } catch (error) {
    console.error("❌ Save session error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ✅ Coaching session analysis helper functions
async function analyzeCoachingSession(messages: ChatMessage[], userId: string) {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
  const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content).join('\n');
  
  return {
    topics_discussed: extractTopics(userMessages),
    learning_outcomes: extractLearningPoints(userMessages, assistantMessages),
    session_quality: messages.length > 4 ? 'detailed' : 'brief',
    follow_up_needed: identifyFollowUpNeeds(assistantMessages),
    coaching_effectiveness: assessCoachingEffectiveness(messages)
  };
}

function extractLearningPoints(userContent: string, assistantContent: string): string[] {
  const learningPoints: string[] = [];
  
  // Extract key learning themes from assistant responses
  if (assistantContent.toLowerCase().includes('equalization')) {
    learningPoints.push('equalization_technique');
  }
  if (assistantContent.toLowerCase().includes('mouthfill')) {
    learningPoints.push('mouthfill_mastery');
  }
  if (assistantContent.toLowerCase().includes('depth') && assistantContent.toLowerCase().includes('progression')) {
    learningPoints.push('depth_progression');
  }
  if (assistantContent.toLowerCase().includes('safety')) {
    learningPoints.push('safety_protocols');
  }
  if (assistantContent.toLowerCase().includes('breathing') || assistantContent.toLowerCase().includes('breathe')) {
    learningPoints.push('breathing_technique');
  }
  
  return learningPoints;
}

function extractTopics(content: string): string[] {
  const topics: string[] = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('depth') || lowerContent.includes('deep')) topics.push('depth_training');
  if (lowerContent.includes('squeeze')) topics.push('squeeze_prevention');
  if (lowerContent.includes('equalization') || lowerContent.includes('equaliz')) topics.push('equalization');
  if (lowerContent.includes('breath') || lowerContent.includes('breathing')) topics.push('breath_hold');
  if (lowerContent.includes('technique')) topics.push('technique_refinement');
  if (lowerContent.includes('safety')) topics.push('safety_protocols');
  if (lowerContent.includes('competition') || lowerContent.includes('compete')) topics.push('competition_prep');
  if (lowerContent.includes('training') || lowerContent.includes('practice')) topics.push('training_methodology');
  
  return topics;
}

function identifyFollowUpNeeds(assistantContent: string): boolean {
  const needsFollowUp = 
    assistantContent.toLowerCase().includes('next session') ||
    assistantContent.toLowerCase().includes('follow up') ||
    assistantContent.toLowerCase().includes('continue') ||
    assistantContent.toLowerCase().includes('practice this') ||
    assistantContent.toLowerCase().includes('work on');
    
  return needsFollowUp;
}

function assessCoachingEffectiveness(messages: ChatMessage[]): 'high' | 'medium' | 'low' {
  const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  const avgLength = totalLength / messages.length;
  
  if (avgLength > 200 && messages.length > 6) return 'high';
  if (avgLength > 100 && messages.length > 3) return 'medium';
  return 'low';
}

async function saveCoachingSessionSummary(supabase: any, userId: string, sessionId: string, insights: any, messageCount: number) {
  try {
    const summary = {
      user_id: userId,
      session_id: sessionId,
      session_type: 'coaching_session',
      message_count: messageCount,
      topics_covered: insights.topics_discussed,
      learning_outcomes: insights.learning_outcomes,
      effectiveness_rating: insights.coaching_effectiveness,
      follow_up_required: insights.follow_up_needed,
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('coaching_session_summaries')
      .insert(summary);
      
    if (error) {
      console.warn('⚠️ Failed to save coaching session summary:', error);
    } else {
      console.log('✅ Coaching session summary saved');
    }
  } catch (error) {
    console.warn('⚠️ Error saving coaching session summary:', error);
  }
}
