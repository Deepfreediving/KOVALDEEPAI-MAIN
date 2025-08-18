"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMemoryService = exports.DiveLogService = void 0;
class DiveLogService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async createDiveLog(userId, diveLog) {
        try {
            const { data, error } = await this.supabase
                .from('dive_logs')
                .insert({
                user_id: userId,
                id: crypto.randomUUID(),
                ...diveLog
            })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error creating dive log:', error);
            return null;
        }
    }
    async getDiveLogs(filter = {}) {
        try {
            let query = this.supabase
                .from('dive_logs')
                .select('*')
                .order('date', { ascending: false });
            if (filter.userId) {
                query = query.eq('user_id', filter.userId);
            }
            if (filter.dateFrom) {
                query = query.gte('date', filter.dateFrom);
            }
            if (filter.dateTo) {
                query = query.lte('date', filter.dateTo);
            }
            if (filter.location) {
                query = query.ilike('location', `%${filter.location}%`);
            }
            if (filter.discipline) {
                query = query.eq('discipline', filter.discipline);
            }
            if (filter.limit) {
                query = query.limit(filter.limit);
            }
            if (filter.offset) {
                query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error fetching dive logs:', error);
            return [];
        }
    }
    async getDiveLog(id, userId) {
        try {
            const { data, error } = await this.supabase
                .from('dive_logs')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error fetching dive log:', error);
            return null;
        }
    }
    async updateDiveLog(id, userId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('dive_logs')
                .update(updates)
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error updating dive log:', error);
            return null;
        }
    }
    async deleteDiveLog(id, userId) {
        try {
            const { error } = await this.supabase
                .from('dive_logs')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);
            if (error)
                throw error;
            return true;
        }
        catch (error) {
            console.error('Error deleting dive log:', error);
            return false;
        }
    }
    async addAnalysis(id, userId, analysis) {
        return this.updateDiveLog(id, userId, { analysis });
    }
}
exports.DiveLogService = DiveLogService;
class UserMemoryService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async saveMemory(userId, memoryType, content) {
        try {
            const { data, error } = await this.supabase
                .from('user_memory')
                .insert({
                id: crypto.randomUUID(),
                user_id: userId,
                memory_type: memoryType,
                content
            })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            console.error('Error saving user memory:', error);
            return null;
        }
    }
    async getMemories(userId, memoryType) {
        try {
            let query = this.supabase
                .from('user_memory')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (memoryType) {
                query = query.eq('memory_type', memoryType);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error('Error fetching user memories:', error);
            return [];
        }
    }
    async deleteMemory(id, userId) {
        try {
            const { error } = await this.supabase
                .from('user_memory')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);
            if (error)
                throw error;
            return true;
        }
        catch (error) {
            console.error('Error deleting user memory:', error);
            return false;
        }
    }
}
exports.UserMemoryService = UserMemoryService;
