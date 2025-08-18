import { DiveLog } from './supabase';
export interface AnalysisRequest {
    diveLog: DiveLog;
    imageBase64?: string;
    previousLogs?: DiveLog[];
    userGoals?: string[];
}
export interface AnalysisResult {
    summary: string;
    recommendations: string[];
    insights: string[];
    safety_notes?: string[];
    progress_analysis?: string;
    errors?: string[];
}
export declare class AIAnalysisService {
    private openai;
    constructor(apiKey: string);
    analyzeDiveLog(request: AnalysisRequest): Promise<AnalysisResult>;
    analyzeImage(imageBase64: string, diveContext?: Partial<DiveLog>): Promise<string>;
    generateProgressReport(diveLogs: DiveLog[], timeframe?: string): Promise<string>;
    private buildSystemPrompt;
    private buildUserPrompt;
    private parseAnalysisResponse;
}
