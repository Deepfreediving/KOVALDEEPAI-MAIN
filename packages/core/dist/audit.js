"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditDiveLog = auditDiveLog;
function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
}
function deriveTimes(log) {
    const total = log.total_time_seconds ?? null;
    const bottom = log.bottom_time ?? 0;
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
async function auditDiveLog(sb, userId, logId) {
    // 1) fetch this log
    const { data: log, error } = await sb
        .from('dive_logs')
        .select('*')
        .eq('id', logId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error || !log)
        throw new Error(error?.message || 'Log not found');
    // 2) fetch recent history (last 10 for trends)
    const { data: history } = await sb
        .from('dive_logs')
        .select('id,reached_depth,total_time_seconds,ear_squeeze,lung_squeeze,recovery_quality,date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(10);
    // 3) compute derived metrics
    const { total, bottom, descent, ascent } = deriveTimes(log);
    const speeds = (log.reached_depth ?? null)
        ? deriveSpeeds(log.reached_depth, descent, ascent)
        : { descent_speed_mps: null, ascent_speed_mps: null };
    // 4) build flags + scores
    const flags = [];
    let completeness = 0;
    let risk = 0;
    const have = (v) => v !== null && v !== undefined && v !== '';
    const required = [
        log.date, log.discipline, log.location, log.reached_depth,
        log.total_time_seconds,
    ];
    const present = required.filter(have).length;
    completeness = Math.round((present / required.length) * 100);
    // Reasonability checks
    if ((log.reached_depth ?? 0) <= 0)
        flags.push('depth_missing_or_zero');
    if (total && total > 480)
        flags.push('very_long_total_time'); // > 8 min
    if (descent && speeds.descent_speed_mps && speeds.descent_speed_mps > 1.4)
        flags.push('descent_too_fast');
    if (ascent && speeds.ascent_speed_mps && speeds.ascent_speed_mps > 1.0)
        flags.push('ascent_too_fast');
    // Physio
    if (log.ear_squeeze)
        flags.push('ear_squeeze_reported');
    if (log.lung_squeeze)
        flags.push('lung_squeeze_reported');
    if ((log.narcosis_level ?? 0) >= 3)
        flags.push('narcosis_concern');
    if ((log.recovery_quality ?? 0) <= 2)
        flags.push('poor_recovery');
    // Compute simple risk
    const depthRisk = clamp(((log.reached_depth ?? 0) / 120) * 40, 0, 40); // scale to 40
    const speedRisk = (flags.includes('ascent_too_fast') ? 15 : 0) + (flags.includes('descent_too_fast') ? 10 : 0);
    const physioRisk = (log.lung_squeeze ? 25 : 0) + (log.ear_squeeze ? 10 : 0) + ((log.narcosis_level ?? 0) >= 3 ? 10 : 0);
    risk = clamp(depthRisk + speedRisk + physioRisk, 0, 100);
    // 5) trend snippets
    const pbs = history?.map(h => h.reached_depth || 0);
    const maxPrev = pbs && pbs.length ? Math.max(...pbs) : 0;
    const isPB = (log.reached_depth ?? 0) > maxPrev;
    if (isPB)
        flags.push('personal_best');
    // 6) save any new derived metrics back to the dive_logs row (adapted for your table name)
    await sb.from('dive_logs').update({
        descent_seconds: descent ?? log.descent_seconds,
        ascent_seconds: ascent ?? log.ascent_seconds,
        descent_speed_mps: speeds.descent_speed_mps ?? log.descent_speed_mps,
        ascent_speed_mps: speeds.ascent_speed_mps ?? log.ascent_speed_mps,
    }).eq('id', logId).eq('user_id', userId);
    const computed = {
        total, bottom, descent, ascent,
        ...speeds,
        isPB,
        depth_prev_best: maxPrev,
    };
    const summary = `Audit for ${log.discipline || 'freedive'} at ${log.location || 'unknown'}:
     depth ${log.reached_depth ?? '–'}m, total ${total ?? '–'}s, ` +
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
    // 7) upsert audit
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
    if (upsertErr)
        throw upsertErr;
    return { completeness, risk, flags, computed, summary, suggestions };
}
