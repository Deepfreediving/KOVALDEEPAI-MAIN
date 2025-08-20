import type { SupabaseClient } from '@supabase/supabase-js';
export declare function auditDiveLog(sb: SupabaseClient, userId: string, logId: string): Promise<{
    completeness: number;
    risk: number;
    flags: string[];
    computed: {
        isPB: boolean;
        depth_prev_best: number;
        descent_speed_mps: number | null;
        ascent_speed_mps: number | null;
        total: number | null;
        bottom: number;
        descent: number | null;
        ascent: number | null;
    };
    summary: string;
    suggestions: string;
}>;
