// ENCLOSE Diagnostic API - Analyze dive issues using your methodology
import { getAdminSupabaseClient } from '../../../lib/supabaseServerClient.js';

// ENCLOSE diagnostic categories from your methodology
const ENCLOSE_CATEGORIES = {
  E: {
    name: 'Equalization Issues',
    triggers: ['eq fail', 'cant equalize', 'mouthfill', 'air stuck', 'reverse pack'],
    questions: [
      'Did EQ fail at a specific depth?',
      'Was there tension or discomfort?', 
      'Did you swallow your mouthfill or run out of air?',
      'Do you have air but can\'t equalize?'
    ],
    recommendations: [
      'Review mouthfill mechanics and timing',
      'Practice 100+ daily dry EQ reps (Level 1)',
      'Check soft palate and glottis control',
      'Verify head position (neutral/slight tuck)'
    ]
  },
  N: {
    name: 'Nitrogen Narcosis',
    triggers: ['loopy', 'tunnel vision', 'slowed down', 'forgot', 'confusion'],
    questions: [
      'Any confusion, tunnel vision, euphoria at depth?',
      'Did it occur consistently at the same depth?'
    ],
    recommendations: [
      'Progress slowly in 2-3m increments',
      'Dive rested and relaxed',
      'Increase surface intervals',
      'Stop progression until symptoms disappear'
    ]
  },
  C: {
    name: 'CO2 Tolerance / Contractions',
    triggers: ['contractions early', 'urge to breathe', 'panicked', 'couldnt relax'],
    questions: [
      'When did contractions start?',
      'How intense were they?',
      'Did they disrupt focus or technique?'
    ],
    recommendations: [
      'Dry CO2 tables (1-2x/week max)',
      'Visualization drills pre-dive',
      'Urge-to-breathe static hangs',
      'Improve streamlining and relaxation'
    ]
  },
  L: {
    name: 'Leg Burn / Muscle Fatigue',
    triggers: ['legs burning', 'kick weak', 'lost power', 'bad form'],
    questions: [
      'Were legs burning early?',
      'Was finning tense or sloppy?',
      'Was sink phase triggered on time?'
    ],
    recommendations: [
      'Dynamic apnea sprints',
      'Anterior tibialis strengthening',
      'Use smaller training fins if form breaks',
      'Adjust sink phase timing'
    ]
  },
  O: {
    name: 'O2 Tolerance / Recovery',
    triggers: ['dizzy', 'lmc', 'blackout', 'long recovery', 'out of breath'],
    questions: [
      'LMC or blackout?',
      'Visual disturbances, cyanosis, tingling?',
      'Was recovery slow or incomplete?'
    ],
    recommendations: [
      'Step back 5-10m to rebuild confidence',
      'Dry O2 tables (1-2x/week max)',
      'Increase surface intervals and rest days',
      'Focus on complete recovery breathing'
    ]
  },
  S: {
    name: 'Squeeze Risk',
    triggers: ['blood', 'throat tight', 'sinus pain', 'coughing'],
    questions: [
      'Any throat scratch, cough, pain, or blood?',
      'Was the dive at or beyond RV?',
      'Cold conditions? Rapid descent?'
    ],
    recommendations: [
      'Rest 1-2 weeks if blood is present',
      'Restart at half depth and progress slowly',
      'Fix head and mouthfill technique',
      'Build flexibility with NPDs and MDR warm-ups'
    ]
  },
  E2: {
    name: 'Equipment Issues',
    triggers: ['mask leak', 'nose clip', 'wetsuit tight', 'fins', 'something felt off'],
    questions: [
      'Mask leaks, fogging, pressure?',
      'Wetsuit too tight or compressing chest?',
      'Fins too soft or stiff?',
      'Weight belt sliding or pulling?'
    ],
    recommendations: [
      'Refit wetsuit and adjust thickness',
      'Use silicone belt to reduce slippage',
      'Replace or modify fins as needed',
      'Rebalance weight for 10m neutral buoyancy'
    ]
  }
};

function analyzeIssue(description) {
  const lowerDesc = description.toLowerCase();
  const matches = [];

  // Check each ENCLOSE category for trigger words
  Object.entries(ENCLOSE_CATEGORIES).forEach(([letter, category]) => {
    const matchCount = category.triggers.filter(trigger => 
      lowerDesc.includes(trigger)
    ).length;

    if (matchCount > 0) {
      matches.push({
        category: letter,
        name: category.name,
        confidence: matchCount / category.triggers.length,
        questions: category.questions,
        recommendations: category.recommendations
      });
    }
  });

  // Sort by confidence and return top matches
  return matches.sort((a, b) => b.confidence - a.confidence);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { description, diveLogId } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Issue description required' });
    }

    // Analyze the issue using ENCLOSE methodology
    const matches = analyzeIssue(description);

    // Get dive log context if provided
    let diveContext = null;
    if (diveLogId) {
      const supabase = getAdminSupabaseClient();
      const { data: dive } = await supabase
        .from('dive_logs')
        .select('*')
        .eq('id', diveLogId)
        .single();
      
      diveContext = dive;
    }

    // Generate CLEAR DIVE assessment if dive context available
    let clearDiveScore = null;
    if (diveContext) {
      const issues = [
        diveContext.squeeze || matches.some(m => m.category === 'S'),
        matches.some(m => m.category === 'E'),
        matches.some(m => m.category === 'C'),
        matches.some(m => m.category === 'L'),
        matches.some(m => m.category === 'O'),
        matches.some(m => m.category === 'N'),
        matches.some(m => m.category === 'E2')
      ];
      
      clearDiveScore = 5 - issues.filter(Boolean).length;
    }

    // Determine primary category and next steps
    const primaryIssue = matches[0];
    let nextSteps = ['Complete diagnostic questions above'];
    
    if (primaryIssue) {
      nextSteps = [
        `Focus on ${primaryIssue.name} protocols`,
        'Address root cause before progression',
        'Track improvement in next dive log',
        clearDiveScore !== null && clearDiveScore < 3 ? 
          'Consider stepping back depth progression' : 
          'Monitor for pattern repetition'
      ].filter(Boolean);
    }

    res.status(200).json({
      success: true,
      primaryCategory: primaryIssue?.category || 'Unknown',
      primaryIssue: primaryIssue?.name || 'Needs further analysis',
      confidence: primaryIssue?.confidence || 0,
      allMatches: matches,
      clearDiveScore,
      nextSteps,
      diagnosticQuestions: primaryIssue?.questions || [
        'Can you describe exactly when the issue occurred?',
        'Was this the first time experiencing this?',
        'What depth did it happen at?',
        'How did you handle it in the moment?'
      ],
      recommendations: primaryIssue?.recommendations || [
        'Document detailed dive log entry',
        'Consult with certified instructor',
        'Consider stepping back progression',
        'Focus on technique before depth'
      ],
      kovaQuote: "The most important thing isn't knowing everything — it's learning how to ask the right question. E.N.C.L.O.S.E. helps you get there."
    });

  } catch (error) {
    console.error('ENCLOSE Diagnostic API error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze dive issue',
      details: error.message 
    });
  }
}
