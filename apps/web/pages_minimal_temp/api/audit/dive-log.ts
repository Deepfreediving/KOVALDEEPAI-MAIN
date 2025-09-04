import { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabase';
import handleCors from '@/utils/handleCors';
import type { SupabaseClient } from '@supabase/supabase-js';

// Inline audit logic for this API
type DiveLog = {
  id: string;
  user_id: string;
  date: string | Date;
  discipline: string | null;
  location: string | null;
  reached_depth: number | null;
  target_depth: number | null;
  total_time_seconds: number | null;
  bottom_time: number | null;
  descent_seconds: number | null;
  ascent_seconds: number | null;
  mouthfill_depth: number | null;
  issue_depth: number | null;
  ear_squeeze: boolean | null;
  lung_squeeze: boolean | null;
  narcosis_level: number | null;
  recovery_quality: number | null;
  gear: Record<string, unknown>;
  ai_summary: string | null;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function deriveTimes(log: DiveLog) {
  const total = log.total_time_seconds ?? null;
  const bottom = log.bottom_time ?? 0;
  let descent = log.descent_seconds ?? null;
  let ascent  = log.ascent_seconds ?? null;

  if (total && !descent && !ascent) {
    const travel = Math.max(total - bottom, 0);
    descent = Math.round(travel * 0.52);
    ascent  = Math.max(travel - descent, 0);
  }
  return { total, bottom, descent, ascent };
}

function deriveSpeeds(depth: number | null, descent?: number | null, ascent?: number | null) {
  const d = depth ?? null;
  const ds = descent && descent > 0 ? Number((d! / descent).toFixed(3)) : null;
  const as = ascent  && ascent  > 0 ? Number((d! / ascent ).toFixed(3)) : null;
  return { descent_speed_mps: ds, ascent_speed_mps: as };
}

async function auditDiveLog(sb: SupabaseClient, userId: string, logId: string) {
  // 1) fetch this log
  const { data: log, error } = await sb
    .from('dive_logs')
    .select('*')
    .eq('id', logId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !log) throw new Error(error?.message || 'Log not found');

  // 2) fetch recent history (last 10 for trends)
  const { data: history } = await sb
    .from('dive_logs')
    .select('id,reached_depth,total_time_seconds,ear_squeeze,lung_squeeze,recovery_quality,date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(10);

  // 3) compute derived metrics
  const { total, bottom, descent, ascent } = deriveTimes(log as DiveLog);
  const speeds = (log.reached_depth ?? null)
    ? deriveSpeeds(log.reached_depth, descent, ascent)
    : { descent_speed_mps: null, ascent_speed_mps: null };

  // 4) build flags + scores
  const flags: string[] = [];
  let completeness = 0;
  let risk = 0;

  const have = (v: unknown) => v !== null && v !== undefined && v !== '';
  const required = [
    log.date, log.discipline, log.location, log.reached_depth,
    log.total_time_seconds,
  ];
  const present = required.filter(have).length;
  completeness = Math.round((present / required.length) * 100);

  // Reasonability checks
  if ((log.reached_depth ?? 0) <= 0) flags.push('depth_missing_or_zero');
  if (total && total > 480) flags.push('very_long_total_time');
  if (descent && speeds.descent_speed_mps && speeds.descent_speed_mps > 1.4)
    flags.push('descent_too_fast');
  if (ascent && speeds.ascent_speed_mps && speeds.ascent_speed_mps > 1.0)
    flags.push('ascent_too_fast');

  // Physio
  if (log.ear_squeeze)  flags.push('ear_squeeze_reported');
  if (log.lung_squeeze) flags.push('lung_squeeze_reported');
  if ((log.narcosis_level ?? 0) >= 3) flags.push('narcosis_concern');
  if ((log.recovery_quality ?? 0) <= 2) flags.push('poor_recovery');

  // Compute simple risk
  const depthRisk = clamp(((log.reached_depth ?? 0) / 120) * 40, 0, 40);
  const speedRisk = (flags.includes('ascent_too_fast') ? 15 : 0) + (flags.includes('descent_too_fast') ? 10 : 0);
  const physioRisk = (log.lung_squeeze ? 25 : 0) + (log.ear_squeeze ? 10 : 0) + ((log.narcosis_level ?? 0) >= 3 ? 10 : 0);
  risk = clamp(depthRisk + speedRisk + physioRisk, 0, 100);

  // 5) trend snippets
  const pbs = history?.map(h => h.reached_depth || 0);
  const maxPrev = pbs && pbs.length ? Math.max(...pbs) : 0;
  const isPB = (log.reached_depth ?? 0) > maxPrev;
  if (isPB) flags.push('personal_best');

  // 6) save derived metrics back to dive_logs
  await sb.from('dive_logs').update({
    descent_seconds: descent ?? log.descent_seconds,
    ascent_seconds:  ascent  ?? log.ascent_seconds,
    descent_speed_mps: speeds.descent_speed_mps ?? log.descent_speed_mps,
    ascent_speed_mps:  speeds.ascent_speed_mps  ?? log.ascent_speed_mps,
  }).eq('id', logId).eq('user_id', userId);

  const computed = {
    total, bottom, descent, ascent,
    ...speeds,
    isPB,
    depth_prev_best: maxPrev,
  };

  const summary =
    `Audit for ${log.discipline || 'freedive'} at ${log.location || 'unknown'}: ` +
    `depth ${log.reached_depth ?? '–'}m, total ${total ?? '–'}s, ` +
    `descent ${descent ?? '–'}s (${speeds.descent_speed_mps ?? '–'} m/s), ` +
    `ascent ${ascent ?? '–'}s (${speeds.ascent_speed_mps ?? '–'} m/s).`;

  const suggestions = [
    speeds.ascent_speed_mps && speeds.ascent_speed_mps > 0.9
      ? 'Slow your ascent to ~0.6–0.8 m/s.'
      : null,
    log.lung_squeeze ? 'Suspend deep attempts; return gradually after medical clearance.' : null,
    (log.recovery_quality ?? 3) <= 2 ? 'Add longer surface recovery and post-dive breathing protocol.' : null,
    !have(log.mouthfill_depth) && (log.discipline || '').toLowerCase().includes('cwt')
      ? 'Record mouthfill depth to track equalization margin.'
      : null,
  ].filter(Boolean).map(s => `• ${s}`).join('\n');

  // 7) try to upsert audit (table might not exist yet)
  try {
    const { error: upsertErr } = await sb.from('dive_log_audit').upsert({
      user_id: userId,
      log_id: logId,
      completeness_score: completeness,
      risk_score: risk,
      flags,
      computed,
      summary,
      suggestions: suggestions || 'No immediate issues detected.',
    }, { onConflict: 'user_id,log_id' });
    if (upsertErr) console.warn('⚠️ Could not save audit to dive_log_audit table:', upsertErr.message);
  } catch (err) {
    console.warn('⚠️ dive_log_audit table not available, skipping audit save');
  }

  return { completeness, risk, flags, computed, summary, suggestions };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await handleCors(req, res);
    if (req.method === 'OPTIONS') return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { logId, userId } = req.body;

    if (!logId) {
      return res.status(400).json({ error: 'logId is required' });
    }

    console.log('🧮 Starting dive log audit for logId:', logId, 'userId:', userId);

    const supabase = getServerClient();

    // Use provided userId or try to get from auth
    let finalUserId = userId;
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized - no user found' });
      }
      finalUserId = user.id;
    }

    // Handle UUID conversion for consistency (same as dive-logs.js)
    const crypto = require('crypto');
    let final_user_id;
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalUserId);
    if (isUUID) {
      final_user_id = finalUserId;
    } else {
      // Create a deterministic UUID from the user identifier
      const hash = crypto.createHash('md5').update(finalUserId).digest('hex');
      final_user_id = [
        hash.substr(0, 8),
        hash.substr(8, 4), 
        hash.substr(12, 4),
        hash.substr(16, 4),
        hash.substr(20, 12)
      ].join('-');
    }

    const result = await auditDiveLog(supabase, final_user_id, logId);
    
    console.log('✅ Dive log audit completed:', {
      completeness: result.completeness,
      risk: result.risk,
      flags: result.flags.length,
      logId
    });

    return res.status(200).json({ 
      success: true, 
      audit: result 
    });

  } catch (error) {
    console.error('❌ Dive log audit error:', error);
    return res.status(500).json({ 
      error: error.message || 'Audit failed',
      details: 'Failed to audit dive log'
    });
  }
}
