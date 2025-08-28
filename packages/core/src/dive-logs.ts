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

export class DiveLogService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async createDiveLog(userId: string, diveLog: CreateDiveLogRequest): Promise<DiveLog | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('dive_logs')
        .insert({
          user_id: userId,
          id: crypto.randomUUID(),
          ...diveLog
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating dive log:', error);
      return null;
    }
  }

  async getDiveLogs(filter: DiveLogFilter = {}): Promise<DiveLog[]> {
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

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching dive logs:', error);
      return [];
    }
  }

  async getDiveLog(id: string, userId: string): Promise<DiveLog | null> {
    try {
      const { data, error } = await this.supabase
        .from('dive_logs')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching dive log:', error);
      return null;
    }
  }

  async updateDiveLog(id: string, userId: string, updates: Partial<CreateDiveLogRequest & { analysis?: string }>): Promise<DiveLog | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('dive_logs')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating dive log:', error);
      return null;
    }
  }

  async deleteDiveLog(id: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('dive_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting dive log:', error);
      return false;
    }
  }

  async addAnalysis(id: string, userId: string, analysis: string): Promise<DiveLog | null> {
    return this.updateDiveLog(id, userId, { analysis });
  }
}

export class UserMemoryService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async saveMemory(userId: string, memoryType: UserMemory['memory_type'], content: any): Promise<UserMemory | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('user_memory')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          memory_type: memoryType,
          content
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving user memory:', error);
      return null;
    }
  }

  async getMemories(userId: string, memoryType?: UserMemory['memory_type']): Promise<UserMemory[]> {
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

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user memories:', error);
      return [];
    }
  }

  async deleteMemory(id: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_memory')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting user memory:', error);
      return false;
    }
  }
}
