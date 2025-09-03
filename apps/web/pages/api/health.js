import { healthCheck } from '@/lib/supabase'
export default async function handler(req, res) {
  const result = await healthCheck()
  res.status(result.status === 'healthy' ? 200 : 500).json(result)
}
