// 🔥 TEST OPENAI API DIRECTLY
const fetch = require('node-fetch');

async function testOpenAIDirectly() {
    console.log('🔥 TESTING OPENAI API DIRECTLY...');
    console.log('=' .repeat(60));
    
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-api-key-here';
    
    try {
        console.log('📞 Testing OpenAI Chat Completions API...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Koval AI, a professional freediving coach. Provide helpful, safety-focused advice.'
                    },
                    {
                        role: 'user',
                        content: 'Hello, can you help me with freediving?'
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });
        
        console.log(`📊 Response Status: ${response.status}`);
        console.log(`📊 Response Headers:`, response.headers.raw());
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ OpenAI API Error (${response.status}):`, errorText);
            return false;
        }
        
        const data = await response.json();
        console.log('✅ OpenAI API Response:');
        console.log('- Model:', data.model);
        console.log('- Usage:', data.usage);
        console.log('- Content:', data.choices[0]?.message?.content?.substring(0, 100) + '...');
        
        return true;
        
    } catch (error) {
        console.error('❌ OpenAI Test Failed:', error.message);
        return false;
    }
}

async function testLocal() {
    console.log('\n🔥 TESTING LOCAL CHAT ENDPOINT...');
    console.log('=' .repeat(60));
    
    try {
        const response = await fetch('https://kovaldeepai-main.vercel.app/api/openai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Hello, can you help me with freediving?',
                userId: 'test-user',
                profile: { pb: 25, isInstructor: false }
            })
        });
        
        console.log(`📊 Local Endpoint Status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Local Endpoint Error (${response.status}):`, errorText);
            return false;
        }
        
        const data = await response.json();
        console.log('✅ Local Endpoint Response:');
        console.log('- Fallback Used:', data.metadata?.fallbackUsed);
        console.log('- Processing Time:', data.metadata?.processingTime + 'ms');
        console.log('- Content:', data.assistantMessage?.content?.substring(0, 150) + '...');
        
        if (data.metadata?.fallbackUsed) {
            console.log('⚠️ FALLBACK WAS USED - Original Error:', data.metadata.originalError);
        }
        
        return !data.metadata?.fallbackUsed;
        
    } catch (error) {
        console.error('❌ Local Test Failed:', error.message);
        return false;
    }
}

async function runTests() {
    const openaiWorks = await testOpenAIDirectly();
    const localWorks = await testLocal();
    
    console.log('\n🔥 TEST RESULTS:');
    console.log('=' .repeat(60));
    console.log(`OpenAI Direct API: ${openaiWorks ? '✅ Working' : '❌ Failed'}`);
    console.log(`Local Chat Endpoint: ${localWorks ? '✅ Working' : '❌ Using Fallback'}`);
    
    if (openaiWorks && !localWorks) {
        console.log('\n💡 DIAGNOSIS: OpenAI API works, but local endpoint has issues');
        console.log('- Check environment variables in Vercel');
        console.log('- Check Pinecone connectivity');
        console.log('- Check user memory functions');
    } else if (!openaiWorks) {
        console.log('\n💡 DIAGNOSIS: OpenAI API key or quota issue');
        console.log('- Check API key validity');
        console.log('- Check OpenAI account billing/quota');
    } else if (localWorks) {
        console.log('\n✅ DIAGNOSIS: Everything is working properly!');
    }
}

runTests().catch(console.error);
