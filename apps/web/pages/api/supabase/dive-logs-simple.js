// DEPRECATED: Use /api/supabase/dive-logs
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Deprecated-Endpoint', 'true')
  return res.status(410).json({
    error: 'This endpoint is deprecated. Use /api/supabase/dive-logs',
    redirect: '/api/supabase/dive-logs',
  })
}
