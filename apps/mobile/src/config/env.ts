import Constants from 'expo-constants';

const getEnvVar = (name: string): string => {
  const value = Constants.expoConfig?.extra?.[name] || process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

export const ENV = {
  SUPABASE_URL: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  OPENAI_API_KEY: getEnvVar('EXPO_PUBLIC_OPENAI_API_KEY'),
} as const;

export default ENV;
