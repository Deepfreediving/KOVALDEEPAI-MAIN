"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAnalysisService = void 0;
const openai_1 = __importDefault(require("openai"));
class AIAnalysisService {
    constructor(apiKey) {
        this.openai = new openai_1.default({
            apiKey: apiKey
        });
    }
    async analyzeDiveLog(request) {
        try {
            const systemPrompt = this.buildSystemPrompt();
            const userPrompt = this.buildUserPrompt(request);
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1500
            });
            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from OpenAI');
            }
            return this.parseAnalysisResponse(response);
        }
        catch (error) {
            console.error('Error analyzing dive log:', error);
            return {
                summary: 'Analysis failed',
                recommendations: [],
                insights: [],
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async analyzeImage(imageBase64, diveContext) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Analyze this freediving watch/computer image. Extract any dive data you can see (depth, time, surface interval, etc.). Context: ${diveContext ? JSON.stringify(diveContext) : 'No additional context'}`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500
            });
            return completion.choices[0]?.message?.content || 'Could not analyze image';
        }
        catch (error) {
            console.error('Error analyzing image:', error);
            return 'Image analysis failed';
        }
    }
    async generateProgressReport(diveLogs, timeframe = '30 days') {
        try {
            const systemPrompt = `You are an expert freediving coach analyzing a diver's progress over ${timeframe}. 
      Provide insights on improvements, trends, and recommendations for continued development.`;
            const userPrompt = `Analyze these dive logs for progress over ${timeframe}:
      ${JSON.stringify(diveLogs, null, 2)}
      
      Focus on:
      - Depth progression
      - Time improvements  
      - Consistency patterns
      - Technical development
      - Safety awareness
      - Areas for improvement`;
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });
            return completion.choices[0]?.message?.content || 'Could not generate progress report';
        }
        catch (error) {
            console.error('Error generating progress report:', error);
            return 'Progress report generation failed';
        }
    }
    buildSystemPrompt() {
        return `You are Koval AI, an expert freediving coach and safety instructor. 
    Analyze dive logs with focus on:
    
    1. SAFETY - Always prioritize safety recommendations
    2. TECHNIQUE - Breathing, relaxation, equalization
    3. PROGRESSION - Gradual depth/time improvements
    4. RECOVERY - Surface intervals and rest periods
    5. PSYCHOLOGICAL - Mental preparation and confidence
    
    Provide structured feedback in JSON format:
    {
      "summary": "Brief overview of the dive",
      "recommendations": ["Specific actionable advice"],
      "insights": ["Key observations about technique/performance"],
      "safety_notes": ["Any safety concerns or improvements"],
      "progress_analysis": "Assessment of improvement trajectory"
    }`;
    }
    buildUserPrompt(request) {
        let prompt = `Analyze this freediving session:
    
    Dive Details:
    - Date: ${request.diveLog.date}
    - Location: ${request.diveLog.location || 'Not specified'}
    - Discipline: ${request.diveLog.discipline || 'Not specified'}
    - Depth: ${request.diveLog.depth || 'Not specified'}m
    - Duration: ${request.diveLog.duration || 'Not specified'}s
    - Notes: ${request.diveLog.notes || 'No notes'}`;
        if (request.previousLogs && request.previousLogs.length > 0) {
            prompt += `\n\nRecent dive history for comparison:\n${JSON.stringify(request.previousLogs.slice(0, 5), null, 2)}`;
        }
        if (request.userGoals && request.userGoals.length > 0) {
            prompt += `\n\nDiver's current goals: ${request.userGoals.join(', ')}`;
        }
        if (request.imageBase64) {
            prompt += `\n\nWatch/computer image data is available for analysis.`;
        }
        return prompt;
    }
    parseAnalysisResponse(response) {
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(response);
            return {
                summary: parsed.summary || 'No summary provided',
                recommendations: parsed.recommendations || [],
                insights: parsed.insights || [],
                safety_notes: parsed.safety_notes || [],
                progress_analysis: parsed.progress_analysis || undefined
            };
        }
        catch {
            // Fallback to text parsing if JSON fails
            return {
                summary: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
                recommendations: [],
                insights: [],
                safety_notes: []
            };
        }
    }
}
exports.AIAnalysisService = AIAnalysisService;
