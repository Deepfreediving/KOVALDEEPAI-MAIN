import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { DiveLogService, DiveLog, createSupabaseClientFromEnv } from '@koval-ai/core';

interface DiveLogListProps {
  userId: string;
}

export default function DiveLogList({ userId }: DiveLogListProps) {
  const [diveLogs, setDiveLogs] = useState<DiveLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiveLogs();
  }, [userId]);

  const loadDiveLogs = async () => {
    try {
      setLoading(true);
      const supabase = createSupabaseClientFromEnv();
      const diveLogService = new DiveLogService(supabase);
      const logs = await diveLogService.getDiveLogs({ userId: userId });
      setDiveLogs(logs);
    } catch (error) {
      console.error('Error loading dive logs:', error);
      Alert.alert('Error', 'Failed to load dive logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading dive logs...</Text>
      </View>
    );
  }

  if (diveLogs.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No dive logs yet</Text>
        <Text style={styles.emptySubtext}>Start logging your dives!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your Dive Logs</Text>
      {diveLogs.map((log) => (
        <TouchableOpacity key={log.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.logDate}>{formatDate(log.date)}</Text>
            <Text style={styles.logDiscipline}>{log.discipline}</Text>
          </View>
          
          <View style={styles.logDetails}>
            {log.location && (
              <Text style={styles.logLocation}>📍 {log.location}</Text>
            )}
            
            <View style={styles.depthInfo}>
              {log.depth && (
                <Text style={styles.depthText}>
                  Depth: {log.depth}m
                </Text>
              )}
              {log.duration && (
                <Text style={styles.depthText}>
                  Duration: {log.duration}s
                </Text>
              )}
            </View>
            
            {log.notes && (
              <Text style={styles.logNotes} numberOfLines={2}>
                {log.notes}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 20,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 50,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  logCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  logDiscipline: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  logDetails: {
    gap: 8,
  },
  logLocation: {
    fontSize: 14,
    color: '#94a3b8',
  },
  depthInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  depthText: {
    fontSize: 14,
    color: '#60a5fa',
    fontWeight: '500',
  },
  logNotes: {
    fontSize: 14,
    color: '#cbd5e1',
    fontStyle: 'italic',
  },
});
