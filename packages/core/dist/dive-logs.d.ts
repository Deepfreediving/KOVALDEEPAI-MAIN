import { SupabaseClient } from '@supabase/supabase-js';
import { Database, DiveLog, UserMemory } from './supabase';
export interface CreateDiveLogRequest {
    date: string;
    location?: string;
    discipline?: string;
    depth?: number;
    duration?: number;
    notes?: string;
    watch_photo?: string;
}
export interface DiveLogFilter {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    location?: string;
    discipline?: string;
    limit?: number;
    offset?: number;
}
export declare class DiveLogService {
    private supabase;
    constructor(supabase: SupabaseClient<Database>);
    createDiveLog(userId: string, diveLog: CreateDiveLogRequest): Promise<DiveLog | null>;
    getDiveLogs(filter?: DiveLogFilter): Promise<DiveLog[]>;
    getDiveLog(id: string, userId: string): Promise<DiveLog | null>;
    updateDiveLog(id: string, userId: string, updates: Partial<CreateDiveLogRequest & {
        analysis?: string;
    }>): Promise<DiveLog | null>;
    deleteDiveLog(id: string, userId: string): Promise<boolean>;
    addAnalysis(id: string, userId: string, analysis: string): Promise<DiveLog | null>;
}
export declare class UserMemoryService {
    private supabase;
    constructor(supabase: SupabaseClient<Database>);
    saveMemory(userId: string, memoryType: UserMemory['memory_type'], content: any): Promise<UserMemory | null>;
    getMemories(userId: string, memoryType?: UserMemory['memory_type']): Promise<UserMemory[]>;
    deleteMemory(id: string, userId: string): Promise<boolean>;
}
