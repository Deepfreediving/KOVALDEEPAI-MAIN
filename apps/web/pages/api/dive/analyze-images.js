// Re-analyze existing dive_log_image rows in parallel and persist extracted_metrics
import { getAdminClient } from '@/lib/supabase'
import OpenAI from 'openai'
import sharp from 'sharp'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const CONCURRENCY = Number(process.env.IMAGE_ANALYSIS_CONCURRENCY) || 3

function pLimit(concurrency) {
  const queue = []
  let active = 0
  const next = () => {
    if (queue.length === 0) return
    if (active >= concurrency) return
    active++
    const { fn, resolve, reject } = queue.shift()
    Promise.resolve()
      .then(fn)
      .then((v) => { active--; resolve(v); next(); })
      .catch((err) => { active--; reject(err); next(); })
  }
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); })
}

async function analyzeWithVision(base64Image, mimeType = 'image/jpeg') {
  // Minimal prompt forcing JSON schema similar to upload-image.js
  const prompt = `You are an OCR/vision parser. Output ONLY valid JSON with fields: { extractedData: { maxDepth: number|null, diveTimeSeconds: number|null, diveTime: string|null, temperature: number|null, date: string|null }, profileAnalysis: { graphVisible: boolean, descentPhase: { averageDescentRate: number|null }, ascentPhase: { averageAscentRate: number|null }, bottomPhase: { bottomTime: number|null } }, coachingInsights: { performanceRating: number|null }, confidence: string }`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [ { role: 'user', content: prompt }, { role: 'user', content: `Image (base64): data:${mimeType};base64,${base64Image}` } ],
    max_tokens: 1000,
    temperature: 0.0,
  })

  let text = response.choices?.[0]?.message?.content || ''
  // Strip fences
  text = text.replace(/```json\s*/g, '').replace(/```/g, '').trim()
  try { return JSON.parse(text) } catch (e) { return { raw: text } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const supabase = getAdminClient()
    if (!supabase) throw new Error('Supabase admin client not configured')

    // Query for recent images without extracted metrics
    const { data: images, error } = await supabase
      .from('dive_log_image')
      .select('*')
      .is('extracted_metrics', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    if (!images || images.length === 0) return res.status(200).json({ success: true, message: 'No images to analyze' })

    const limiter = pLimit(CONCURRENCY)
    const tasks = images.map(img => limiter(async () => {
      try {
        // Download from storage
        const { data: urlData } = supabase.storage.from(img.bucket || 'dive-images').getPublicUrl(img.path_original || img.path_compressed)
        const fetchRes = await fetch(urlData.publicUrl)
        const buffer = await fetchRes.arrayBuffer()
        // Preprocess small thumbnail to speed analysis
        const thumb = await sharp(Buffer.from(buffer)).resize(1200, 800, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer()
        const base64 = thumb.toString('base64')
        const analysis = await analyzeWithVision(base64, img.mime_type || 'image/jpeg')
        const extracted_metrics = {}
        if (analysis.extractedData) {
          const d = analysis.extractedData
          if (d.maxDepth) extracted_metrics.max_depth = Number(d.maxDepth)
          if (d.diveTimeSeconds) extracted_metrics.dive_time_seconds = Number(d.diveTimeSeconds)
          if (d.temperature) extracted_metrics.temperature = Number(d.temperature)
        }

        // Update DB
        const { error: updateError } = await supabase.from('dive_log_image').update({
          ai_analysis: { ...(img.ai_analysis || {}), vision_reanalysis: analysis },
          extracted_metrics,
          updated_at: new Date().toISOString()
        }).eq('id', img.id)

        if (updateError) {
          console.warn('Failed to update image', img.id, updateError)
          return { id: img.id, ok: false, error: updateError }
        }

        return { id: img.id, ok: true, extracted_metrics }
      } catch (err) {
        console.warn('Analysis failed for', img.id, err.message || err)
        return { id: img.id, ok: false, error: err.message }
      }
    }))

    const results = await Promise.all(tasks)
    return res.status(200).json({ success: true, analyzed: results.length, results })
  } catch (error) {
    console.error('analyze-images failed', error)
    return res.status(500).json({ success: false, error: error.message })
  }
}
