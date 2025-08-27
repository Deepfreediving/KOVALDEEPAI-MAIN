#!/usr/bin/env node

/**
 * 🧠 INVISIBLE INTELLIGENCE SYSTEM TEST
 * 
 * This demonstrates how the AI coaching system works "magically" - 
 * Users just have natural conversations and the system invisibly
 * detects context and triggers the right tools without exposing
 * the underlying complexity.
 */

console.log('🧠 Testing Invisible Intelligence System...\n');

// Simulate user messages that should trigger different tools
const testMessages = [
  {
    role: 'user',
    content: 'I want to dive to 50m next week, what should I plan for?',
    expectedTrigger: 'eq-plan (50m depth detected)'
  },
  {
    role: 'user', 
    content: 'I keep getting a squeeze at around 35 meters and my equalization is failing',
    expectedTrigger: 'enclose-diagnostic (squeeze + equalization issues)'
  },
  {
    role: 'user',
    content: 'Can you help me with my mouthfill technique? I am struggling with the reverse pack',
    expectedTrigger: 'mouthfill-advisor (mouthfill keywords)'
  },
  {
    role: 'user',
    content: 'I am scared about my first deep dive, what safety protocols should I follow?',
    expectedTrigger: 'safety-checklist (safety concerns + dive planning)'
  },
  {
    role: 'user',
    content: 'I want to improve my training plan to progress from my current 40m to 60m goal',
    expectedTrigger: 'training-plan (progression planning)'
  }
];

// Import the intelligent coaching system logic
const analyzeMessage = (content) => {
  const triggers = [];
  const contentLower = content.toLowerCase();

  // 🎯 EQ PLAN DETECTION
  const depthMatch = contentLower.match(/(\d+)\s*m/);
  if (depthMatch && (contentLower.includes('dive') || contentLower.includes('plan') || contentLower.includes('target'))) {
    triggers.push({
      type: 'eq-plan',
      confidence: 0.9,
      data: { targetDepth: parseInt(depthMatch[1]) }
    });
  }

  // 🩺 ENCLOSE DIAGNOSTIC
  const problemWords = ['squeeze', 'pressure', 'equalization', 'failing', 'problem', 'struggling'];
  const problemScore = problemWords.filter(word => contentLower.includes(word)).length;
  if (problemScore >= 2) {
    triggers.push({
      type: 'enclose-diagnostic',
      confidence: Math.min(problemScore / 4, 1.0),
      data: { symptoms: problemWords.filter(word => contentLower.includes(word)) }
    });
  }

  // 💨 MOUTHFILL ADVISOR
  if (contentLower.includes('mouthfill') || contentLower.includes('reverse pack')) {
    triggers.push({
      type: 'mouthfill-advisor',
      confidence: 0.8,
      data: { context: content }
    });
  }

  // 🛡️ SAFETY CHECKLIST
  const safetyWords = ['safety', 'scared', 'first', 'protocols'];
  if (safetyWords.some(word => contentLower.includes(word))) {
    triggers.push({
      type: 'safety-checklist',
      confidence: 0.85,
      data: { urgency: contentLower.includes('scared') ? 'high' : 'medium' }
    });
  }

  // 📅 TRAINING PLAN
  if ((contentLower.includes('training') || contentLower.includes('plan')) && 
      (contentLower.includes('progress') || contentLower.includes('improve'))) {
    triggers.push({
      type: 'training-plan',
      confidence: 0.7,
      data: { context: content }
    });
  }

  return triggers;
};

// Test each message
testMessages.forEach((message, index) => {
  console.log(`\n📝 Test ${index + 1}:`);
  console.log(`User: "${message.content}"`);
  console.log(`Expected: ${message.expectedTrigger}`);
  
  const triggers = analyzeMessage(message.content);
  
  if (triggers.length > 0) {
    console.log('✅ AI Analysis:');
    triggers.forEach(trigger => {
      console.log(`   🎯 ${trigger.type} (${Math.round(trigger.confidence * 100)}% confidence)`);
      if (trigger.data.targetDepth) console.log(`      → Target depth: ${trigger.data.targetDepth}m`);
      if (trigger.data.symptoms) console.log(`      → Symptoms: ${trigger.data.symptoms.join(', ')}`);
      if (trigger.data.urgency) console.log(`      → Urgency: ${trigger.data.urgency}`);
    });
    
    // Simulate the natural response injection
    const response = generateNaturalResponse(triggers[0]);
    console.log(`\n💬 AI Response (injected invisibly):`);
    console.log(`"${response.substring(0, 120)}..."`);
  } else {
    console.log('❌ No triggers detected');
  }
});

function generateNaturalResponse(trigger) {
  switch (trigger.type) {
    case 'eq-plan':
      return `For your ${trigger.data.targetDepth}m dive, I'd recommend this approach: Start your mouthfill at ${Math.round(trigger.data.targetDepth * 0.8)}m with about ${trigger.data.targetDepth * 2.5}ml volume. Plan for ${Math.round(trigger.data.targetDepth / 5)} total equalizations...`;
    
    case 'enclose-diagnostic':
      return `I can help you work through this systematically. Based on what you've described with ${trigger.data.symptoms.join(' and ')}, let's focus on pressure equalization optimization. Here's my recommendation...`;
    
    case 'mouthfill-advisor':
      return `For mouthfill technique, let's start with the fundamentals: Begin with ¼ mouthfill (grape-sized) at around 35-40m. Use your tongue to create the pocket, not forceful packing...`;
    
    case 'safety-checklist':
      return trigger.data.urgency === 'high' 
        ? "⚠️ Safety is always the priority. Let's address your concerns: Never dive alone, use conservative progression (2-3m increments), and extend surface intervals..."
        : "Here's your safety checklist: Complete C.L.E.A.R. protocol before each dive, proper warm-up, and emergency protocols reviewed with your buddy...";
    
    case 'training-plan':
      return `Let's create a smart progression plan: I recommend 2x pool sessions for technique, 1x depth session for conservative progression, and 1x dry training for flexibility...`;
    
    default:
      return 'I understand what you're looking for. Let me help you with that...';
  }
}

console.log('\n\n🎯 SUMMARY:');
console.log('The Invisible Intelligence System works by:');
console.log('1. 👂 Listening to natural conversation');
console.log('2. 🧠 Analyzing context with pattern matching');
console.log('3. 🎯 Triggering appropriate coaching tools invisibly');
console.log('4. 💬 Injecting responses as if from human expertise');
console.log('5. 🎭 Never revealing the underlying system logic');

console.log('\n✨ This creates a "magical" experience where users feel');
console.log('   like they are talking to an expert coach who has');
console.log('   instant access to sophisticated analysis tools,');
console.log('   without ever seeing the computational complexity.\n');

console.log('🎪 PATENTABILITY ASSESSMENT:');
console.log('This invisible, contextual tool integration approach');
console.log('combined with natural language injection could be');
console.log('novel and patentable as a "Contextual AI Tool');
console.log('Orchestration System for Domain Expertise Delivery"');
