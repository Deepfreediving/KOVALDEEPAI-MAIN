"use strict";
// ENCLOSE Diagnostic Engine - Daniel Koval's systematic performance evaluation
// Routes performance issues to root causes and actionable solutions
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnoseWithEnclose = diagnoseWithEnclose;
// ENCLOSE diagnostic routing based on Daniel's methodology
function diagnoseWithEnclose(data) {
    const assessments = [];
    // E - Equalization Issues
    if (data.eqFailureDepth || data.eqFailureType) {
        assessments.push(diagnoseEqualizationIssues(data));
    }
    // N - Nitrogen Narcosis  
    if (data.narcosisDepth || (data.narcosisSymptoms && data.narcosisSymptoms.length > 0)) {
        assessments.push(diagnoseNarcosis(data));
    }
    // C - CO2 Tolerance (Early Contractions)
    if (data.contractionsStartTime && data.diveTimeSeconds) {
        const contractionPercent = data.contractionsStartTime / data.diveTimeSeconds;
        if (contractionPercent < 0.33) { // Earlier than 1/3 of dive
            assessments.push(diagnoseCO2Issues(data));
        }
    }
    // L - Leg Burn / Muscle Fatigue
    if (data.legBurnDepth && data.legBurnDepth < data.reachedDepthM * 0.5) {
        assessments.push(diagnoseLegBurn(data));
    }
    // O - O2 Tolerance / Recovery  
    if (data.o2Symptoms && data.o2Symptoms.length > 0) {
        assessments.push(diagnoseO2Issues(data));
    }
    // S - Squeeze
    if (data.squeezeType) {
        assessments.push(diagnoseSqueeze(data));
    }
    // E - Equipment Issues
    if (data.equipmentIssues && data.equipmentIssues.length > 0) {
        assessments.push(diagnoseEquipmentIssues(data));
    }
    // Sort by priority
    return assessments.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}
function diagnoseEqualizationIssues(data) {
    const rootCauses = [];
    const recommendations = [];
    const trainingDrills = [];
    const safetyFlags = [];
    let diagnosis = "Equalization failure";
    let priority = 'high';
    // Analyze failure type and depth
    if (data.eqFailureType === 'cant_equalize') {
        diagnosis = "Unable to equalize - technique or anatomy issue";
        rootCauses.push("Poor Frenzel technique", "Soft palate or glottis tension");
        recommendations.push("Review basic Frenzel mechanics", "Practice soft palate control");
        trainingDrills.push("100+ daily dry EQ reps (shirtless, in mirror)", "Tongue-out EQ test");
    }
    if (data.eqFailureType === 'swallowed_mouthfill') {
        diagnosis = "Mouthfill management failure";
        priority = 'critical';
        rootCauses.push("Poor glottis control", "Inadequate mouthfill technique");
        recommendations.push("Master glottis lock before mouthfill progression");
        trainingDrills.push("Glottis isolation drills", "NPD progression");
        safetyFlags.push("Do not attempt mouthfill until technique is solid");
    }
    if (data.eqFailureType === 'air_ran_out') {
        diagnosis = "Insufficient air volume for equalization";
        rootCauses.push("Mouthfill too small or taken too shallow", "Inefficient EQ technique");
        recommendations.push("Increase mouthfill volume or take deeper", "Improve EQ efficiency");
    }
    // Depth-specific analysis using Daniel's plateau knowledge
    if (data.eqFailureDepth) {
        const failureDepth = data.eqFailureDepth;
        if (failureDepth >= 55 && failureDepth <= 62) {
            diagnosis = "58m plateau - classic mouthfill timing issue";
            rootCauses.push("Late/too-small mouthfill", "Soft palate misrouting");
            recommendations.push("Take mouthfill earlier (30-40m)", "Practice soft palate control");
        }
        if (failureDepth >= 68 && failureDepth <= 85) {
            diagnosis = "70-82m plateau - pocket management failure";
            rootCauses.push("Glottis micro-leaks", "Cheek recoil insufficient", "Narcosis affecting technique");
            recommendations.push("Strengthen glottic control", "Improve cheek counter-pressure");
            trainingDrills.push("Glottis lock holds", "Cheek resistance training");
        }
        if (failureDepth >= 85 && failureDepth <= 102) {
            diagnosis = "88-98m plateau - technique breakdown under pressure";
            rootCauses.push("EQ stride collapse", "Neck extension", "Tongue retraction compensation");
            recommendations.push("Maintain neutral neck", "Smaller, more frequent EQ doses");
            safetyFlags.push("Check for tongue-soft-palate lock compensation");
        }
    }
    // Technique observations
    if (data.neckPosition === 'extended') {
        rootCauses.push("Neck extension kinking Eustachian tubes");
        recommendations.push("Practice neutral or slightly tucked neck position");
    }
    return {
        category: 'E',
        priority,
        diagnosis,
        rootCauses,
        recommendations,
        trainingDrills,
        nextSteps: ["Fix technique issues before depth progression", "Test in controlled environment"],
        safetyFlags
    };
}
function diagnoseNarcosis(data) {
    return {
        category: 'N',
        priority: 'medium',
        diagnosis: `Nitrogen narcosis at ${data.narcosisDepth || 'unknown depth'}m`,
        rootCauses: ["Depth beyond current adaptation", "Fatigue or elevated CO2"],
        recommendations: [
            "Progress slowly in 2-3m increments at this depth band",
            "Dive rested and relaxed",
            "Increase surface intervals"
        ],
        trainingDrills: ["Mental rehearsal at target depth", "Visualization exercises"],
        nextSteps: ["Stop progression until symptoms disappear", "Set conservative turn depth"],
        safetyFlags: data.narcosisDepth && data.narcosisDepth > 40 ?
            ["Significant narcosis - medical evaluation recommended"] : []
    };
}
function diagnoseCO2Issues(data) {
    const contractionPercent = (data.contractionsStartTime || 0) / data.diveTimeSeconds;
    return {
        category: 'C',
        priority: contractionPercent < 0.2 ? 'high' : 'medium',
        diagnosis: `Early contractions at ${Math.round(contractionPercent * 100)}% of dive`,
        rootCauses: [
            "Poor CO2 tolerance",
            "Inadequate warm-up",
            "Mental tension or anxiety",
            "Inefficient technique increasing O2 consumption"
        ],
        recommendations: [
            "Improve pre-dive relaxation",
            "Extend warm-up protocol",
            "Practice mental preparation techniques"
        ],
        trainingDrills: [
            "Dry CO2 tables (1-2x/week max)",
            "Urge-to-breathe static hangs",
            "Visualization exercises"
        ],
        nextSteps: ["Reduce target depth until tolerance improves", "Focus on relaxation training"],
        safetyFlags: contractionPercent < 0.15 ? ["Very early contractions - check for medical issues"] : []
    };
}
function diagnoseLegBurn(data) {
    return {
        category: 'L',
        priority: 'medium',
        diagnosis: `Leg fatigue at ${data.legBurnDepth}m (early in dive)`,
        rootCauses: [
            "Poor finning technique",
            "Inadequate leg conditioning",
            "Inappropriate fins for skill level",
            "Rushed descent pace"
        ],
        recommendations: [
            "Improve finning efficiency",
            "Slow descent rate",
            "Consider softer training fins"
        ],
        trainingDrills: [
            "Dynamic apnea sprints",
            "Anterior tibialis strengthening",
            "Finning technique practice"
        ],
        nextSteps: ["Focus on technique before depth progression", "Improve anaerobic capacity"],
        safetyFlags: []
    };
}
function diagnoseO2Issues(data) {
    const symptoms = data.o2Symptoms || [];
    const hasSerious = symptoms.some(s => s.includes('blackout') || s.includes('LMC') || s.includes('visual'));
    return {
        category: 'O',
        priority: hasSerious ? 'critical' : 'high',
        diagnosis: `O2 symptoms: ${symptoms.join(', ')}`,
        rootCauses: [
            "Dive beyond current O2 tolerance",
            "Inefficient technique increasing consumption",
            "Inadequate surface intervals"
        ],
        recommendations: [
            "Reduce target depth by 5-10m",
            "Increase surface intervals",
            "Focus on efficiency training"
        ],
        trainingDrills: [
            "Dry O2 tables (1-2x/week max)",
            "Never combine with CO2 tables",
            "Complete hook breathing practice"
        ],
        nextSteps: ["Conservative progression until tolerance rebuilds"],
        safetyFlags: hasSerious ?
            ["Serious O2 symptoms - immediate depth reduction required"] :
            ["Monitor for progression of symptoms"]
    };
}
function diagnoseSqueeze(data) {
    const squeezeType = data.squeezeType || 'unknown';
    return {
        category: 'S',
        priority: 'critical',
        diagnosis: `${squeezeType} squeeze detected`,
        rootCauses: [
            "Forced equalization under pressure",
            "Tense descent technique",
            "Dive beyond flexibility limits"
        ],
        recommendations: [
            squeezeType === 'lung' ? "Rest 1-2 weeks, restart at half depth" : "Stop diving immediately",
            "Review technique with instructor",
            "Medical evaluation if blood present"
        ],
        trainingDrills: [
            "Flexibility improvement (NPDs, MDR warm-ups)",
            "Relaxation training",
            "Technique refinement on land"
        ],
        nextSteps: ["Do not dive until cleared", "Progressive return at reduced depths"],
        safetyFlags: ["STOP DIVING - squeeze indicates injury risk"]
    };
}
function diagnoseEquipmentIssues(data) {
    return {
        category: 'E2',
        priority: 'medium',
        diagnosis: `Equipment issues: ${data.equipmentIssues?.join(', ')}`,
        rootCauses: ["Equipment malfunction or poor fit"],
        recommendations: ["Address equipment issues before next dive"],
        trainingDrills: [],
        nextSteps: ["Test/replace equipment", "Practice with backup gear"],
        safetyFlags: []
    };
}
