// 🔍 OPENAI ERROR DEBUGGER for Wix Frontend Page
// Run this in your Wix page console to identify OpenAI errors

console.log('🚀 Starting OpenAI Error Debugging...');

// Track all fetch requests to identify OpenAI errors
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const [url, options] = args;
    
    // Log all API calls
    console.log('🌐 API Call:', {
        url: url,
        method: options?.method || 'GET',
        headers: options?.headers,
        body: options?.body ? JSON.parse(options.body) : null
    });
    
    // Check if this is an OpenAI call
    if (url.includes('openai')) {
        console.log('🤖 OpenAI API Call detected:', {
            url: url,
            requestBody: options?.body ? JSON.parse(options.body) : null
        });
        
        // Validate OpenAI request format
        if (options?.body) {
            try {
                const body = JSON.parse(options.body);
                
                // Check for common OpenAI API requirements
                if (!body.message && !body.messages) {
                    console.error('❌ OPENAI ERROR: Missing "message" or "messages" field');
                    console.error('Current body:', body);
                }
                
                if (!body.userId) {
                    console.warn('⚠️ OPENAI WARNING: Missing userId field');
                }
                
                // Check for legacy userMessage field (should be message)
                if (body.userMessage) {
                    console.error('❌ OPENAI ERROR: Using legacy "userMessage" field, should be "message"');
                }
                
            } catch (parseError) {
                console.error('❌ OPENAI ERROR: Invalid JSON in request body');
            }
        }
    }
    
    // Call original fetch and handle response
    return originalFetch.apply(this, args)
        .then(response => {
            if (!response.ok && url.includes('openai')) {
                console.error('❌ OpenAI API Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: url
                });
                
                // Try to get error details
                response.clone().text().then(errorText => {
                    console.error('Error details:', errorText);
                });
            }
            return response;
        })
        .catch(error => {
            if (url.includes('openai')) {
                console.error('❌ OpenAI Fetch Error:', error);
            }
            throw error;
        });
};

// Test current API endpoints configuration
console.log('🔧 Current API Configuration:');
console.log('WIX_CONNECTION_API:', typeof WIX_CONNECTION_API !== 'undefined' ? WIX_CONNECTION_API : 'Not defined');
console.log('MEMBER_PROFILE_API:', typeof MEMBER_PROFILE_API !== 'undefined' ? MEMBER_PROFILE_API : 'Not defined');
console.log('TEST_API:', typeof TEST_API !== 'undefined' ? TEST_API : 'Not defined');
console.log('WIX_CHAT_API:', typeof WIX_CHAT_API !== 'undefined' ? WIX_CHAT_API : 'Not defined');
console.log('WIX_USER_MEMORY_API:', typeof WIX_USER_MEMORY_API !== 'undefined' ? WIX_USER_MEMORY_API : 'Not defined');

// Check if any APIs are incorrectly pointing to OpenAI
const endpoints = [
    'WIX_CONNECTION_API',
    'MEMBER_PROFILE_API', 
    'TEST_API',
    'WIX_USER_MEMORY_API',
    'WIX_GET_USER_PROFILE_API',
    'USER_MEMORY_API',
    'LOAD_MEMORIES_API',
    'GET_USER_MEMORY_API',
    'SAVE_TO_USER_MEMORY_API'
];

endpoints.forEach(endpointName => {
    if (typeof window[endpointName] !== 'undefined') {
        const url = window[endpointName];
        if (url.includes('openai/chat') && !endpointName.includes('CHAT')) {
            console.error(`❌ CONFIGURATION ERROR: ${endpointName} incorrectly points to OpenAI chat endpoint: ${url}`);
        }
    }
});

// Function to test a specific endpoint
window.testEndpoint = async function(endpointName) {
    const url = window[endpointName];
    if (!url) {
        console.error(`Endpoint ${endpointName} not found`);
        return;
    }
    
    console.log(`🧪 Testing ${endpointName}: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                test: true,
                userId: 'debug-user'
            })
        });
        
        const result = await response.text();
        console.log(`✅ ${endpointName} response:`, result);
        
    } catch (error) {
        console.error(`❌ ${endpointName} error:`, error);
    }
};

console.log('✅ OpenAI Error Debugger installed!');
console.log('💡 Now trigger the action that causes the OpenAI error');
console.log('📋 All API calls will be logged with detailed information');
console.log('🔧 Use testEndpoint("ENDPOINT_NAME") to test specific endpoints');
