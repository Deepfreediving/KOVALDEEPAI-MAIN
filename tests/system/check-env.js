// Check environment variables
console.log('🔧 Environment Check:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('PINECONE_API_KEY exists:', !!process.env.PINECONE_API_KEY);
