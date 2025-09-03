// Quick diagnostic for Pinecone integration
require('dotenv').config({ path: '.env.local' });

console.log('🔍 PINECONE DIAGNOSTIC REPORT');
console.log('=' .repeat(40));

// Environment check
console.log('\n📋 Environment Variables:');
console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? `SET (${process.env.PINECONE_API_KEY.length} chars)` : 'MISSING ❌');
console.log('PINECONE_INDEX:', process.env.PINECONE_INDEX || 'MISSING ❌');
console.log('PINECONE_HOST:', process.env.PINECONE_HOST || 'MISSING ❌');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `SET (${process.env.OPENAI_API_KEY.length} chars)` : 'MISSING ❌');

console.log('\n🔍 DIAGNOSTIC SUMMARY:');
console.log('Based on your console logs, we can see:');
console.log('✅ Admin mode: Working');
console.log('✅ OpenAI API: Working (8027ms response time)');
console.log('✅ Dive logs: 44 loaded from localStorage');
console.log('❌ Pinecone logs: Missing from console');
console.log('');
console.log('💡 LIKELY ISSUES:');
console.log('1. Pinecone index is empty (no documents ingested)');
console.log('2. Network timeout when calling Pinecone API'); 
console.log('3. Pinecone API key authentication failing');
console.log('4. The queryPinecone function is being skipped due to an early return');
console.log('');
console.log('🧪 NEXT STEPS:');
console.log('1. Check if you see these logs in your console when chatting:');
console.log('   - "🔍 Querying Pinecone via: http://localhost:3000/api/pinecone/pineconequery-gpt"');
console.log('   - "📝 Query: [your message]"');
console.log('   - "📡 Pinecone API response status: [status code]"');
console.log('');
console.log('2. If you DON\'T see those logs, the queryPinecone function isn\'t being called');
console.log('3. If you DO see them but get 0 chunks, your Pinecone index is empty');
console.log('');
console.log('🚀 To test Pinecone directly, visit this URL in your browser:');
console.log('   http://localhost:3000/api/pinecone/pineconequery-gpt');
console.log('   (Should show "Method Not Allowed" - that means the endpoint exists)');
console.log('');
console.log('📝 Try this chat message to test: "What is freediving safety?"');
console.log('   Watch your browser console for the Pinecone logs we added.');
