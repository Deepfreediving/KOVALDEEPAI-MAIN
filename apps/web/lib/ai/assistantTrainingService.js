/**
 * 🧠 AI ASSISTANT TRAINING SERVICE
 * Manages personalized OpenAI assistants for each diver
 * Each assistant learns from the user's dive patterns and provides personalized coaching
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AssistantTrainingService {
  
  /**
   * 🆕 Create a new personalized assistant for a user
   */
  static async createUserAssistant(userId, userProfile) {
    try {
      console.log(`🧠 Creating AI assistant for user: ${userId}`);
      
      const assistantName = `${userProfile.full_name || 'Diver'}'s Freediving Coach`;
      const instructions = this.generatePersonalizedInstructions(userProfile);
      
      const assistant = await openai.beta.assistants.create({
        name: assistantName,
        instructions: instructions,
        model: "gpt-4-turbo-preview",
        tools: [
          { type: "file_search" },
          { type: "code_interpreter" }
        ],
        metadata: {
          user_id: userId,
          created_at: new Date().toISOString(),
          version: "1.0"
        }
      });
      
      console.log(`✅ Assistant created: ${assistant.id} for ${assistantName}`);
      return assistant;
      
    } catch (error) {
      console.error('❌ Error creating assistant:', error);
      throw error;
    }
  }
  
  /**
   * 📊 Train assistant with new dive log data
   */
  static async trainWithDiveLog(assistantId, diveLogData, extractedMetrics = {}) {
    try {
      console.log(`🏋️ Training assistant ${assistantId} with new dive log`);
      
      // Create structured training data
      const trainingData = this.formatDiveLogForTraining(diveLogData, extractedMetrics);
      
      // Create a vector store for this user's data if it doesn't exist
      const vectorStore = await this.getOrCreateUserVectorStore(assistantId);
      
      // Upload training data as a file
      const file = await this.createTrainingFile(trainingData, diveLogData.id);
      
      // Add file to the vector store
      await openai.beta.vectorStores.files.create(vectorStore.id, {
        file_id: file.id
      });
      
      // Update assistant to use the vector store
      await openai.beta.assistants.update(assistantId, {
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStore.id]
          }
        }
      });
      
      console.log(`✅ Assistant ${assistantId} trained with dive log ${diveLogData.id}`);
      return { success: true, fileId: file.id };
      
    } catch (error) {
      console.error('❌ Error training assistant:', error);
      throw error;
    }
  }
  
  /**
   * 💬 Generate personalized coaching insights
   */
  static async generateInsights(assistantId, query, userDiveHistory) {
    try {
      console.log(`🤔 Generating insights from assistant ${assistantId}`);
      
      // Create a thread for this conversation
      const thread = await openai.beta.threads.create();
      
      // Add context about recent dives
      const contextMessage = this.formatRecentDivesContext(userDiveHistory);
      
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `${contextMessage}\n\nUser question: ${query}`
      });
      
      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId
      });
      
      // Wait for completion
      const completedRun = await this.waitForRunCompletion(thread.id, run.id);
      
      // Get the response
      const messages = await openai.beta.threads.messages.list(thread.id);
      const response = messages.data[0].content[0].text.value;
      
      console.log(`✅ Generated personalized insight for user`);
      return response;
      
    } catch (error) {
      console.error('❌ Error generating insights:', error);
      throw error;
    }
  }
  
  /**
   * 🔍 Analyze dive patterns and predict issues
   */
  static async analyzeDivePatterns(assistantId, recentDives) {
    try {
      const patternsQuery = `
        Analyze my recent dive patterns and identify:
        1. Safety concerns or warning signs
        2. Performance trends (improving/declining)
        3. Specific recommendations for my next training session
        4. Any dangerous patterns I should be aware of
        
        Focus on: depth progression, squeeze incidents, exit protocols, and any recurring issues.
      `;
      
      return await this.generateInsights(assistantId, patternsQuery, recentDives);
      
    } catch (error) {
      console.error('❌ Error analyzing patterns:', error);
      throw error;
    }
  }
  
  // ========================
  // HELPER METHODS
  // ========================
  
  static generatePersonalizedInstructions(userProfile) {
    return `You are a highly experienced freediving coach and safety expert, specifically assigned to coach ${userProfile.full_name || 'this diver'}.

COACHING PERSONALITY:
- You know this diver's complete history, patterns, and tendencies
- You provide personalized advice based on their specific data
- You prioritize safety above all else
- You're encouraging but honest about risks

EXPERTISE AREAS:
- Freediving techniques (CWT, FIM, CNF, STA, DYN)
- Safety protocols and blackout prevention
- Equipment optimization
- Performance analysis
- Mental preparation and relaxation
- Depth progression and training plans

ANALYSIS APPROACH:
- Always reference the diver's historical data when giving advice
- Identify patterns across multiple dives
- Warn about dangerous trends before they become serious
- Celebrate improvements and milestones
- Provide specific, actionable recommendations

SAFETY PRIORITY:
- Never encourage unsafe depth progression
- Always emphasize proper safety protocols
- Flag any concerning patterns immediately
- Recommend medical consultation when appropriate

USER CONTEXT:
- Certification Level: ${userProfile.certification_level || 'Unknown'}
- Experience: ${userProfile.years_experience || 'Unknown'} years
- Personal Best: ${userProfile.personal_best_depth || 'Unknown'}m

Remember: This diver trusts you with their safety and progression. Always provide thoughtful, data-driven coaching based on their complete dive history.`;
  }
  
  static formatDiveLogForTraining(diveLogData, extractedMetrics) {
    return `DIVE LOG ENTRY
Date: ${diveLogData.date}
Discipline: ${diveLogData.discipline}
Location: ${diveLogData.location || 'Unknown'}

PERFORMANCE DATA:
- Target Depth: ${diveLogData.target_depth || 'Not set'}m
- Reached Depth: ${diveLogData.reached_depth || extractedMetrics.max_depth || 'Unknown'}m
- Total Time: ${diveLogData.total_dive_time || extractedMetrics.dive_time_seconds || 'Unknown'}
- Mouthfill Depth: ${diveLogData.mouthfill_depth || 'Not recorded'}m

SAFETY & ISSUES:
- Squeeze: ${diveLogData.squeeze ? 'YES' : 'NO'}
- Issue Depth: ${diveLogData.issue_depth || 'None'}m
- Issue Details: ${diveLogData.issue_comment || 'None'}
- Exit Protocol: ${diveLogData.exit_protocol || 'Not recorded'}
- Surface Protocol: ${diveLogData.surface_protocol || 'Not recorded'}

TRAINING NOTES:
${diveLogData.notes || 'No additional notes'}

EXTRACTED METRICS (from dive computer):
${extractedMetrics ? JSON.stringify(extractedMetrics, null, 2) : 'No extracted metrics'}

AI ANALYSIS:
${diveLogData.ai_analysis ? JSON.stringify(diveLogData.ai_analysis, null, 2) : 'No AI analysis available'}

---
END DIVE LOG ENTRY
`;
  }
  
  static formatRecentDivesContext(diveHistory) {
    if (!diveHistory || diveHistory.length === 0) {
      return "No recent dive history available.";
    }
    
    const recent = diveHistory.slice(0, 5); // Last 5 dives
    let context = "RECENT DIVE HISTORY:\n";
    
    recent.forEach((dive, index) => {
      context += `${index + 1}. ${dive.date}: ${dive.discipline} to ${dive.reached_depth}m`;
      if (dive.squeeze) context += " (SQUEEZE INCIDENT)";
      if (dive.issue_comment) context += ` - Issue: ${dive.issue_comment}`;
      context += "\n";
    });
    
    return context;
  }
  
  static async getOrCreateUserVectorStore(assistantId) {
    try {
      // Try to find existing vector store for this assistant
      const assistant = await openai.beta.assistants.retrieve(assistantId);
      
      if (assistant.tool_resources?.file_search?.vector_store_ids?.length > 0) {
        const vectorStoreId = assistant.tool_resources.file_search.vector_store_ids[0];
        return await openai.beta.vectorStores.retrieve(vectorStoreId);
      }
      
      // Create new vector store
      const vectorStore = await openai.beta.vectorStores.create({
        name: `${assistant.name} Training Data`,
        metadata: {
          assistant_id: assistantId,
          created_at: new Date().toISOString()
        }
      });
      
      return vectorStore;
      
    } catch (error) {
      console.error('❌ Error with vector store:', error);
      throw error;
    }
  }
  
  static async createTrainingFile(content, diveLogId) {
    try {
      // Create a temporary file with the training data
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], `dive-log-${diveLogId}.txt`, { type: 'text/plain' });
      
      const uploadedFile = await openai.files.create({
        file: file,
        purpose: 'assistants'
      });
      
      return uploadedFile;
      
    } catch (error) {
      console.error('❌ Error creating training file:', error);
      throw error;
    }
  }
  
  static async waitForRunCompletion(threadId, runId, maxWaitTime = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const run = await openai.beta.threads.runs.retrieve(threadId, runId);
      
      if (run.status === 'completed') {
        return run;
      } else if (run.status === 'failed' || run.status === 'cancelled') {
        throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Run timed out');
  }
}

export default AssistantTrainingService;
