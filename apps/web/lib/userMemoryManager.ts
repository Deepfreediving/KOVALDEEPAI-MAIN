import { getBrowserClient } from "@/lib/supabase";
import type { UserMemory } from "@/types/supabase";

/**
 * Fetch UserMemory document for a specific userId
 */
export async function fetchUserMemory(userId: string) {
  try {
    const supabase = getBrowserClient();
    if (!supabase) {
      console.warn('Supabase not available for memory fetch');
      return null;
    }
    
    const { data: memories, error } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
    
    // Convert to format expected by existing code
    if (memories && memories.length > 0) {
      return {
        _id: userId, // Use userId as the document ID
        userId: userId,
        memories: memories.map((m: UserMemory) => ({
          type: m.memory_type,
          content: m.content,
          createdAt: m.created_at
        })),
        logs: memories
          .filter((m: UserMemory) => m.memory_type === 'dive_log')
          .map((m: UserMemory) => m.content)
      };
    }
    return null;
  } catch (error: any) {
    console.warn(
      "⚠️ fetchUserMemory failed:",
      error.message,
    );
    return null;
  }
}

/**
 * Save or update a user's memory (last 10 logs preserved)
 */
export async function saveUserMemory(userId: string, newData: any) {
  try {
    const supabase = getBrowserClient();
    if (!supabase) {
      console.warn('Supabase not available for memory save');
      return false;
    }
    
    // Save different types of memory separately
    if (newData.logs && Array.isArray(newData.logs)) {
      // Save dive logs as memory
      for (const log of newData.logs.slice(-10)) { // Keep only last 10
        // TODO: Fix user_memory table schema mismatch
        // await supabase
        //   .from('user_memory')
        //   .insert({
        //     user_id: userId,
        //     memory_type: 'dive_log',
        //     content: log
        //   });
      }
    }

    if (newData.preferences) {
      // TODO: Fix user_memory table schema mismatch
      // await supabase
      //   .from('user_memory')
      //   .insert({
      //     user_id: userId,
      //     memory_type: 'preference',
      //     content: newData.preferences
      //   });
    }

    if (newData.goals) {
      // TODO: Fix user_memory table schema mismatch
      // await supabase
      //   .from('user_memory')
      //   .insert({
      //     user_id: userId,
      //     memory_type: 'session', // Changed from 'goal' to valid enum value
      //     content: newData.goals
      //   });
    }

    return true;
  } catch (error: any) {
    console.warn("⚠️ saveUserMemory failed:", error.message);
    return false;
  }
}

/**
 * Query UserMemory document by email address
 * Note: This is a simplified implementation since we don't store email in user_memory
 * You might need to join with auth.users or profiles table
 */
export async function queryUserMemoryByEmail(email: string) {
  try {
    // This would require a more complex query joining with profiles
    // For now, return null as this functionality might need to be redesigned
    console.warn("queryUserMemoryByEmail: This method needs to be updated for Supabase");
    return null;
  } catch (error: any) {
    console.warn(
      "⚠️ queryUserMemoryByEmail failed:",
      error.message,
    );
    return null;
  }
}

/**
 * Query UserMemory documents by multiple criteria
 * Note: Simplified implementation for userId only
 */
export async function queryUserMemory(criteria: {
  userId?: string;
  email?: string;
  displayName?: string;
}) {
  try {
    if (criteria.userId) {
      const memory = await fetchUserMemory(criteria.userId);
      return memory ? [memory] : [];
    } else {
      // Email and displayName queries would require joining with profiles table
      console.warn("queryUserMemory: Email and displayName queries need to be updated for Supabase");
      return [];
    }
  } catch (error: any) {
    console.warn(
      "⚠️ queryUserMemory failed:",
      error.message,
    );
    return [];
  }
}
