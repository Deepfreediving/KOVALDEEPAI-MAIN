/**
 * 🎯 SUPABASE GENERATED TYPES - Unified Database Schema
 * 
 * This file contains the consolidated database types for the KovalAI application.
 * Generated from existing schema and optimized for type safety.
 * 
 * Last updated: September 3, 2025
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      dive_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          discipline: string
          target_depth: number | null
          reached_depth: number | null
          location: string | null
          notes: string | null
          ai_analysis: string | null
          ai_summary?: string | null
          // Extended optional fields used across the app
          mouthfill_depth?: number | null
          issue_depth?: number | null
          total_dive_time?: string | null // e.g., "MM:SS"
          squeeze?: boolean | null
          issue_comment?: string | null
          exit?: string | null
          attempt_type?: string | null
          surface_protocol?: string | null
          bottom_time_seconds?: number | null
          total_time_seconds?: number | null
          discipline_type?: string | null
          exit_status?: string | null
          duration_seconds?: number | null
          distance_m?: number | null
          ear_squeeze?: boolean | null
          lung_squeeze?: boolean | null
          narcosis_level?: number | null
          recovery_quality?: string | null
          gear?: Json | null
          metadata?: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          date: string
          discipline: string
          target_depth?: number | null
          reached_depth?: number | null
          location?: string | null
          notes?: string | null
          ai_analysis?: string | null
          ai_summary?: string | null
          mouthfill_depth?: number | null
          issue_depth?: number | null
          total_dive_time?: string | null
          squeeze?: boolean | null
          issue_comment?: string | null
          exit?: string | null
          attempt_type?: string | null
          surface_protocol?: string | null
          bottom_time_seconds?: number | null
          total_time_seconds?: number | null
          discipline_type?: string | null
          exit_status?: string | null
          duration_seconds?: number | null
          distance_m?: number | null
          ear_squeeze?: boolean | null
          lung_squeeze?: boolean | null
          narcosis_level?: number | null
          recovery_quality?: string | null
          gear?: Json | null
          metadata?: Json | null
        }
        Update: {
          user_id?: string
          date?: string
          discipline?: string
          target_depth?: number | null
          reached_depth?: number | null
          location?: string | null
          notes?: string | null
          ai_analysis?: string | null
          ai_summary?: string | null
          mouthfill_depth?: number | null
          issue_depth?: number | null
          total_dive_time?: string | null
          squeeze?: boolean | null
          issue_comment?: string | null
          exit?: string | null
          attempt_type?: string | null
          surface_protocol?: string | null
          bottom_time_seconds?: number | null
          total_time_seconds?: number | null
          discipline_type?: string | null
          exit_status?: string | null
          duration_seconds?: number | null
          distance_m?: number | null
          ear_squeeze?: boolean | null
          lung_squeeze?: boolean | null
          narcosis_level?: number | null
          recovery_quality?: string | null
          gear?: Json | null
          metadata?: Json | null
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          nickname: string
          pb: number | null
          is_instructor: boolean
          membership_level: string
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          nickname: string
          pb?: number | null
          is_instructor?: boolean
          membership_level?: string
          preferences?: Json
        }
        Update: {
          user_id?: string
          nickname?: string
          pb?: number | null
          is_instructor?: boolean
          membership_level?: string
          preferences?: Json
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          session_data: Json
          last_activity: string
          created_at: string
        }
        Insert: {
          user_id: string
          session_data: Json
          last_activity: string
        }
        Update: {
          user_id?: string
          session_data?: Json
          last_activity?: string
        }
      }
      user_memory: {
        Row: {
          id: string
          user_id: string
          memory_type: 'dive_log' | 'preference' | 'chat' | 'analysis'
          content: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          memory_type: 'dive_log' | 'preference' | 'chat' | 'analysis'
          content: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          memory_type?: 'dive_log' | 'preference' | 'chat' | 'analysis'
          content?: Json
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type exports
export type DiveLog = Database['public']['Tables']['dive_logs']['Row']
export type DiveLogInsert = Database['public']['Tables']['dive_logs']['Insert']
export type DiveLogUpdate = Database['public']['Tables']['dive_logs']['Update']

export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
export type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert']
export type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update']

// Helper mapped types for table rows/inserts/updates
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Legacy UserMemory type for backward compatibility
export interface UserMemory {
  user_id: string
  memory_type: 'dive_log' | 'preference' | 'chat' | 'analysis'
  content: Json
  created_at?: string
  updated_at?: string
}
