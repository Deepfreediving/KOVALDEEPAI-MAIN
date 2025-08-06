import axios from 'axios';

export interface Status {
  wix: string;
  openai: string;
  pinecone: string;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * ✅ Simple fetch-based API client (no axios dependency)
 */
async function sendRequest(
  endpoint: string, 
  data: any = {}, 
  options: RequestInit = {}
): Promise<ApiResponse> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      data: result,
      message: 'Request successful'
    };

  } catch (error: any) {
    console.error(`❌ API request failed:`, error.message);
    return {
      success: false,
      error: error.message,
      message: `Request failed: ${error.message}`
    };
  }
}

/**
 * ✅ Test OpenAI chat endpoint
 */
export async function testOpenAI(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await sendRequest('/api/openai/chat', {
      message: 'ping',
      userId: 'test-user',
      profile: { nickname: 'Test User' }
    });

    return {
      success: result.success,
      message: result.success ? 'OpenAI connected' : 'OpenAI failed'
    };
  } catch (error) {
    return {
      success: false,
      message: 'OpenAI test failed'
    };
  }
}

/**
 * ✅ Test Pinecone connection (UPDATED)
 */
export async function testPinecone(): Promise<{ success: boolean; message: string }> {
  try {
    // ✅ Use pineconequery-gpt endpoint
    const result = await sendRequest('/api/pinecone/pineconequery-gpt', {
      query: 'freediving safety',
      returnChunks: true
    });

    return {
      success: result.success,
      message: result.success ? 'Pinecone connected' : 'Pinecone failed'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Pinecone test failed'
    };
  }
}

/**
 * ✅ Test API Handler (if you're using it)
 */
export async function testApiHandler(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await sendRequest('/api/apiHandler', {
      service: 'openai',
      action: 'check',
      data: { test: true }
    });

    return {
      success: result.success,
      message: result.success ? 'API Handler connected' : 'API Handler failed'
    };
  } catch (error) {
    return {
      success: false,
      message: 'API Handler test failed'
    };
  }
}

/**
 * ✅ Check all connections sequentially (safer than Promise.all)
 */
export async function checkAllConnections(): Promise<Status> {
  const status: Status = {
    wix: '⏳ Checking...',
    openai: '⏳ Checking...',
    pinecone: '⏳ Checking...'
  };

  // ✅ Test OpenAI
  console.log('🔍 Testing OpenAI...');
  const openaiTest = await testOpenAI();
  status.openai = openaiTest.success ? '✅ Connected' : '❌ Failed';

  // ✅ Test Pinecone
  console.log('🔍 Testing Pinecone...');
  const pineconeTest = await testPinecone();
  status.pinecone = pineconeTest.success ? '✅ Connected' : '❌ Failed';

  // ✅ For Wix, just check if we're in embed mode
  status.wix = typeof window !== 'undefined' && window.parent !== window 
    ? '✅ Embedded' 
    : '⚠️ Not embedded';

  console.log('📊 Connection status:', status);
  return status;
}

/**
 * ✅ Send chat message (main function for embed)
 */
export async function sendChatMessage(
  message: string,
  userId: string = 'guest',
  profile: any = {}
): Promise<ApiResponse> {
  return await sendRequest('/api/openai/chat', {
    message,
    userId,
    profile,
    embedMode: true
  });
}

/**
 * ✅ Upload image
 */
export async function uploadImage(file: File, userId?: string): Promise<ApiResponse> {
  try {
    const formData = new FormData();
    formData.append('image', file);
    if (userId) formData.append('userId', userId);

    const response = await fetch('/api/openai/upload-dive-image', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      data: result,
      message: 'Image uploaded successfully'
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: 'Image upload failed'
    };
  }
}

/**
 * ✅ Query documents in Pinecone (UPDATED)
 */
export async function queryDocuments(
  query: string,
  topK: number = 5
): Promise<ApiResponse> {
  // ✅ Use pineconequery-gpt endpoint
  return await sendRequest('/api/pinecone/pineconequery-gpt', {
    query,
    returnChunks: true
  });
}

// ✅ Default export with all functions
const apiClient = {
  sendRequest,
  sendChatMessage,
  uploadImage,
  queryDocuments,
  testOpenAI,
  testPinecone,
  testApiHandler,
  checkAllConnections
};

export default apiClient;
