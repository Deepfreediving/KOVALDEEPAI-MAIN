// test-ui-dive-log-flow.js
// Test the complete UI flow: submit dive log -> chat -> get analysis

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testCompleteDiveLogFlow() {
  console.log('🧪 Testing Complete UI Dive Log Flow...\n');
  
  const userId = 'ui-test-user';
  const userProfile = {
    nickname: 'UITestUser',
    contactDetails: { firstName: 'UI Test' }
  };

  // Step 1: Submit a dive log via the API (simulating sidebar form submission)
  console.log('📝 Step 1: Submitting dive log via sidebar form...');
  const diveLogData = {
    userId,
    date: new Date().toISOString().split('T')[0],
    disciplineType: 'Depth',
    discipline: 'CWT',
    location: 'Blue Hole',
    targetDepth: '30',
    reachedDepth: '28',
    mouthfillDepth: '20',
    issueDepth: '',
    squeeze: false,
    exit: 'Good',
    durationOrDistance: '',
    attemptType: 'Training',
    notes: 'Good dive, felt comfortable at depth. Need to work on equalization below 25m.',
    totalDiveTime: '',
    issueComment: '',
    surfaceProtocol: 'Good recovery, clear surface protocol'
  };

  try {
    const saveResponse = await axios.post(`${API_BASE}/api/analyze/save-dive-log`, diveLogData);
    console.log('✅ Dive log saved:', saveResponse.data);
    
    // Wait a moment for background processing
    console.log('⏳ Waiting for background processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.error('❌ Failed to save dive log:', error.message);
    return;
  }

  // Step 2: Load dive logs to verify they're accessible
  console.log('\n📊 Step 2: Loading dive logs to verify storage...');
  try {
    const logsResponse = await axios.get(`${API_BASE}/api/analyze/get-dive-logs?userId=${userId}`);
    console.log('✅ Dive logs loaded:', logsResponse.data.diveLogs?.length || 0, 'logs found');
    
    if (logsResponse.data.diveLogs?.length > 0) {
      console.log('📋 Sample log:', {
        date: logsResponse.data.diveLogs[0].date,
        discipline: logsResponse.data.diveLogs[0].discipline,
        reachedDepth: logsResponse.data.diveLogs[0].reachedDepth,
        notes: logsResponse.data.diveLogs[0].notes?.substring(0, 50) + '...'
      });
    }
  } catch (error) {
    console.error('❌ Failed to load dive logs:', error.message);
  }

  // Step 3: Chat with AI and ask for dive log analysis
  console.log('\n💬 Step 3: Asking Koval AI to analyze the dive log...');
  const chatData = {
    message: 'Can you analyze my most recent dive log and give me coaching feedback?',
    userId,
    embedMode: true,
    profile: userProfile,
    threadId: null
  };

  try {
    const chatResponse = await axios.post(`${API_BASE}/api/openai/chat`, chatData, {
      timeout: 30000 // 30 second timeout for AI response
    });
    
    console.log('✅ AI Analysis received!');
    console.log('🤖 Koval AI Response:');
    console.log('=' * 50);
    console.log(chatResponse.data.content);
    console.log('=' * 50);
    
    // Check if the response mentions the dive log details
    const response = chatResponse.data.content.toLowerCase();
    const hasDepthMention = response.includes('28') || response.includes('30') || response.includes('depth');
    const hasLocationMention = response.includes('blue hole') || response.includes('location');
    const hasNotesMention = response.includes('equalization') || response.includes('25m');
    
    console.log('\n🔍 Analysis Quality Check:');
    console.log('📊 Mentions depth data:', hasDepthMention ? '✅' : '❌');
    console.log('📍 Mentions location:', hasLocationMention ? '✅' : '❌');
    console.log('📝 References notes:', hasNotesMention ? '✅' : '❌');
    
    if (hasDepthMention && hasNotesMention) {
      console.log('\n🎉 SUCCESS: Koval AI successfully analyzed the dive log data!');
    } else {
      console.log('\n⚠️ WARNING: AI response may not be using dive log data');
    }
    
  } catch (error) {
    console.error('❌ Chat request failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }

  console.log('\n✅ Complete UI flow test finished!');
}

runTests().catch(console.error);

async function runTests() {
  await testCompleteDiveLogFlow();
}
