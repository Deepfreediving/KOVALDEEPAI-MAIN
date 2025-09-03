// Dive Log Audit API - Technical evaluation using E.N.C.L.O.S.E. framework
import { getServerClient } from '@/lib/supabase';
import handleCors from '@/utils/handleCors';

// E.N.C.L.O.S.E. JSON Schema for consistent audit structure
const ENCLOSE_SCHEMA = {
  version: "koval_enclose_v1",
  scores: { safety: 0, technique: 0, efficiency: 0, readiness: 0, final: 0 },
  enclose: [
    { code: "E", title: "Equalization", severity: 0, reasons: [], drills: [] },
    { code: "N", title: "Narcosis", severity: 0, reasons: [], drills: [] },
    { code: "C", title: "CO2/Contractions", severity: 0, reasons: [], drills: [] },
    { code: "L", title: "Leg/Finning", severity: 0, reasons: [], drills: [] },
    { code: "O", title: "O2/Recovery", severity: 0, reasons: [], drills: [] },
    { code: "S", title: "Squeeze Risk", severity: 0, reasons: [], drills: [] },
    { code: "E2", title: "Equipment", severity: 0, reasons: [], drills: [] }
  ],
  derived_metrics: {
    descent_mps: null,
    ascent_mps: null,
    vdi_sec_per_meter: null,
    freefall_start_m: null
  },
  flags: { ear_squeeze: false, lung_squeeze: false, lmc: false, bo: false, narcosis: 0 },
  summary: "",
  action_items: []
};

function deriveTimes(log) {
  const total = log.total_time_seconds ?? null;
  const bottom = log.bottom_time_seconds ?? 0;
  let descent = log.descent_seconds ?? null;
  let ascent = log.ascent_seconds ?? null;

  if (total && !descent && !ascent) {
    // crude split if bottom known; otherwise assume symmetric
    const travel = Math.max(total - bottom, 0);
    descent = Math.round(travel * 0.52);
    ascent = Math.max(travel - descent, 0);
  }
  return { total, bottom, descent, ascent };
}

function deriveSpeeds(depth, descent, ascent) {
  const d = depth ?? null;
  const ds = descent && descent > 0 ? Number((d / descent).toFixed(3)) : null;
  const as = ascent && ascent > 0 ? Number((d / ascent).toFixed(3)) : null;
  return { descent_speed_mps: ds, ascent_speed_mps: as };
}

async function auditDiveLogWithEnclose(supabase, userId, logId) {
  console.log(`🔍 Starting E.N.C.L.O.S.E. audit for dive log ${logId} for user ${userId}`);

  // 1) fetch this log
  const { data: log, error } = await supabase
    .from('dive_logs')
    .select('*')
    .eq('id', logId)
    .eq('user_id', userId)
    .maybeSingle();
    
  if (error || !log) {
    console.error('❌ Log not found:', error);
    throw new Error(error?.message || 'Log not found');
  }

  console.log('📊 Found dive log:', log);

  // 2) fetch recent history (last 10 for trends)
  const { data: history } = await supabase
    .from('dive_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(10);

  console.log(`📈 Found ${history?.length || 0} historical dives for pattern analysis`);

  // 3) compute derived metrics
  const { total, descent, ascent } = deriveTimes(log);
  const speeds = (log.reached_depth ?? null)
    ? deriveSpeeds(log.reached_depth, descent, ascent)
    : { descent_speed_mps: null, ascent_speed_mps: null };

  console.log('⚡ Computed speeds:', speeds);

  // 4) Create E.N.C.L.O.S.E. evaluation structure
  const evaluation = JSON.parse(JSON.stringify(ENCLOSE_SCHEMA)); // Deep clone
  
  // Set derived metrics
  evaluation.derived_metrics = {
    descent_mps: speeds.descent_speed_mps,
    ascent_mps: speeds.ascent_speed_mps,
    vdi_sec_per_meter: total && log.reached_depth ? total / log.reached_depth : null,
    freefall_start_m: log.mouthfill_depth || null
  };

  // Set flags
  evaluation.flags = {
    ear_squeeze: Boolean(log.ear_squeeze),
    lung_squeeze: Boolean(log.lung_squeeze),
    lmc: log.exit_status === 'lmc' || false,
    bo: log.exit_status === 'blackout' || false,
    narcosis: log.narcosis_level || 0
  };

  // 5) E.N.C.L.O.S.E. Analysis
  let totalSeverity = 0;

  // E - Equalization Issues
  const eqIssues = evaluation.enclose.find(e => e.code === 'E');
  if (log.ear_squeeze) {
    eqIssues.severity = 3;
    eqIssues.reasons.push('Ear squeeze reported');
    eqIssues.drills.push('Dry EQ practice', 'Valsalva to Frenzel transition');
  }
  if (log.issue_depth && log.issue_comment?.toLowerCase().includes('eq')) {
    eqIssues.severity = Math.max(eqIssues.severity, 2);
    eqIssues.reasons.push(`EQ issue at ${log.issue_depth}m`);
    eqIssues.drills.push('Mouthfill depth progression');
  }
  totalSeverity += eqIssues.severity;

  // N - Narcosis (depth >35m)
  const narcosis = evaluation.enclose.find(e => e.code === 'N');
  const depth = log.reached_depth || 0;
  if (depth > 35 && log.narcosis_level >= 2) {
    narcosis.severity = log.narcosis_level >= 3 ? 3 : 2;
    narcosis.reasons.push(`Narcosis level ${log.narcosis_level} at ${depth}m`);
    narcosis.drills.push('CO₂/O₂ recalibration', 'Depth progression halt');
  }
  totalSeverity += narcosis.severity;

  // C - CO₂ Tolerance / Early Contractions
  const co2Issues = evaluation.enclose.find(e => e.code === 'C');
  if (log.issue_comment?.toLowerCase().includes('contraction') || 
      log.issue_comment?.toLowerCase().includes('urge')) {
    co2Issues.severity = 2;
    co2Issues.reasons.push('Early contractions/urge to breathe');
    co2Issues.drills.push('CO₂ tables (2x/week max)', 'Visualization training');
  }
  if (log.exit_status === 'early_turn') {
    co2Issues.severity = Math.max(co2Issues.severity, 1);
    co2Issues.reasons.push('Early turn on ascent');
    co2Issues.drills.push('Static hangs', 'Streamlining practice');
  }
  totalSeverity += co2Issues.severity;

  // L - Leg Fatigue / Finning Issues
  const legIssues = evaluation.enclose.find(e => e.code === 'L');
  if (log.issue_comment?.toLowerCase().includes('leg') || 
      log.issue_comment?.toLowerCase().includes('fin')) {
    legIssues.severity = 2;
    legIssues.reasons.push('Reported leg/finning issues');
    legIssues.drills.push('Finning technique drills', 'Glute strengthening');
  }
  if (speeds.descent_speed_mps && speeds.descent_speed_mps < 0.8 && depth > 40) {
    legIssues.severity = Math.max(legIssues.severity, 1);
    legIssues.reasons.push('Slow descent suggests finning inefficiency');
    legIssues.drills.push('Kick stroke cycle adjustment');
  }
  totalSeverity += legIssues.severity;

  // O - Oxygen Management / Recovery
  const o2Issues = evaluation.enclose.find(e => e.code === 'O');
  if (log.lung_squeeze || log.exit_status === 'lmc' || log.exit_status === 'blackout') {
    o2Issues.severity = 3;
    o2Issues.reasons.push('Severe O₂ depletion signs');
    o2Issues.drills.push('O₂ Protocol: 2.5min ON/1min OFF', 'Recovery breathing');
  }
  if ((log.recovery_quality || 3) <= 2) {
    o2Issues.severity = Math.max(o2Issues.severity, 2);
    o2Issues.reasons.push('Poor recovery quality');
    o2Issues.drills.push('Extended surface intervals', 'Breathing protocols');
  }
  totalSeverity += o2Issues.severity;

  // S - Squeeze Risk
  const squeezeRisk = evaluation.enclose.find(e => e.code === 'S');
  if (log.lung_squeeze) {
    squeezeRisk.severity = 3;
    squeezeRisk.reasons.push('Lung squeeze detected');
    squeezeRisk.drills.push('Thoracic squeeze prevention', 'NPD practice');
  }
  if (log.ear_squeeze) {
    squeezeRisk.severity = Math.max(squeezeRisk.severity, 2);
    squeezeRisk.reasons.push('Ear squeeze detected');
    squeezeRisk.drills.push('Dry EQ drills', 'Flexibility training');
  }
  totalSeverity += squeezeRisk.severity;

  // E2 - Equipment Issues
  const equipIssues = evaluation.enclose.find(e => e.code === 'E2');
  if (log.issue_comment?.toLowerCase().includes('mask') || 
      log.issue_comment?.toLowerCase().includes('equipment') ||
      log.issue_comment?.toLowerCase().includes('gear')) {
    equipIssues.severity = 1;
    equipIssues.reasons.push('Equipment issues reported');
    equipIssues.drills.push('Equipment fitting check', 'Streamlining review');
  }
  totalSeverity += equipIssues.severity;

  // 6) Calculate scores
  const maxPossibleSeverity = 21; // 7 categories × 3 max severity
  evaluation.scores.safety = Math.max(0, 5 - Math.round((totalSeverity / maxPossibleSeverity) * 5));
  
  evaluation.scores.technique = 3; // Base score, adjust based on performance
  if (speeds.descent_speed_mps && speeds.ascent_speed_mps) {
    const goodSpeeds = speeds.descent_speed_mps >= 0.9 && speeds.descent_speed_mps <= 1.3 &&
                      speeds.ascent_speed_mps >= 0.6 && speeds.ascent_speed_mps <= 0.9;
    evaluation.scores.technique = goodSpeeds ? 5 : 3;
  }
  
  evaluation.scores.efficiency = depth > 0 && total > 0 ? 
    Math.min(5, Math.round((depth / total) * 30)) : 3;
    
  evaluation.scores.readiness = log.attempt_type === 'training' ? 4 : 
                              log.attempt_type === 'pb' ? 3 : 
                              log.attempt_type === 'comp' ? 5 : 3;
  
  // Final weighted score
  evaluation.scores.final = Math.round(
    evaluation.scores.safety * 0.4 +
    evaluation.scores.technique * 0.3 +
    evaluation.scores.efficiency * 0.2 +
    evaluation.scores.readiness * 0.1
  );

  // 7) Generate summary and action items
  const discipline = log.discipline || 'freedive';
  const location = log.location || 'unknown location';
  
  evaluation.summary = `E.N.C.L.O.S.E. Analysis: ${discipline} to ${depth}m at ${location}. ` +
    `Overall score: ${evaluation.scores.final}/5. ` +
    `Key areas: ${evaluation.enclose.filter(e => e.severity > 0).map(e => e.title).join(', ') || 'No major issues'}`;

  evaluation.action_items = [];
  evaluation.enclose.forEach(category => {
    if (category.severity > 0 && category.drills.length > 0) {
      evaluation.action_items.push(`${category.title}: ${category.drills[0]}`);
    }
  });

  if (evaluation.action_items.length === 0) {
    evaluation.action_items.push('Continue current training approach - no immediate concerns detected');
  }

  // 8) Update the dive_log row with computed metrics
  await supabase.from('dive_logs').update({
    descent_seconds: descent ?? log.descent_seconds,
    ascent_seconds: ascent ?? log.ascent_seconds,
    descent_speed_mps: speeds.descent_speed_mps ?? log.descent_speed_mps,
    ascent_speed_mps: speeds.ascent_speed_mps ?? log.ascent_speed_mps,
  }).eq('id', logId).eq('user_id', userId);

  // 9) Save audit to database with E.N.C.L.O.S.E. structure
  const { error: upsertErr } = await supabase.from('dive_log_audit').upsert({
    user_id: userId,
    log_id: logId,
    completeness_score: Math.round((Object.values(log).filter(v => v !== null && v !== '').length / Object.keys(log).length) * 100),
    risk_score: Math.round((1 - evaluation.scores.safety / 5) * 100),
    flags: evaluation.enclose.filter(e => e.severity > 0).map(e => e.code),
    computed: evaluation.derived_metrics,
    summary: evaluation.summary,
    suggestions: evaluation.action_items.join('\n• '),
  }, { onConflict: 'user_id,log_id' });
  
  if (upsertErr) {
    console.error('❌ Audit save error:', upsertErr);
    throw upsertErr;
  }

  console.log('✅ E.N.C.L.O.S.E. audit completed and saved');
  return evaluation;
}

export default async function handler(req, res) {
  try {
    if (handleCors(req, res)) return;
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { logId, userId } = req.body;
    
    if (!logId || !userId) {
      return res.status(400).json({ error: 'logId and userId are required' });
    }

    const supabase = getServerClient();
    
    // Create deterministic UUID for consistency (same as other APIs)
    const crypto = require('crypto');
    let final_user_id;
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (isUUID) {
      final_user_id = userId;
    } else {
      const hash = crypto.createHash('md5').update(userId).digest('hex');
      final_user_id = [
        hash.substr(0, 8),
        hash.substr(8, 4), 
        hash.substr(12, 4),
        hash.substr(16, 4),
        hash.substr(20, 12)
      ].join('-');
    }

    const audit = await auditDiveLogWithEnclose(supabase, final_user_id, logId);

    return res.status(200).json({
      success: true,
      audit
    });

  } catch (error) {
    console.error('❌ Audit API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to audit dive log'
    });
  }
}
