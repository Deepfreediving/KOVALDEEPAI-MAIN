import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { useEffect, useState } from 'react';
import { AuthService, createSupabaseClientFromEnv } from '@koval-ai/core';
import type { User } from '@supabase/supabase-js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth service and check for existing session
    const initAuth = async () => {
      try {
        const supabase = createSupabaseClientFromEnv();
        const authService = new AuthService(supabase);
        const session = await authService.getCurrentSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Loading Koval AI...</Text>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Koval Deep AI</Text>
        <Text style={styles.subtitle}>Mobile Dive Log</Text>
        
        {user ? (
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.emailText}>{user.email}</Text>
          </View>
        ) : (
          <View style={styles.authPrompt}>
            <Text style={styles.promptText}>Please sign in to continue</Text>
          </View>
        )}
        
        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#94a3b8',
    marginBottom: 40,
  },
  userInfo: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    minWidth: 250,
  },
  welcomeText: {
    fontSize: 20,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  authPrompt: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    minWidth: 250,
  },
  promptText: {
    fontSize: 16,
    color: '#f59e0b',
    textAlign: 'center',
  },
});
