// Configuration for Wix App Backend Communication
// @deepfreediving/kovaldeepai-app - Version 5.x (DiveLogs Collection Fix Release)

export const WIX_APP_CONFIG = {
  // Your Wix App Details
  APP_ID: '@deepfreediving/kovaldeepai-app',
  VERSION: '4.x',
  SITE_URL: 'https://www.deepfreediving.com',
  FUNCTIONS_BASE_URL: 'https://www.deepfreediving.com/_functions',
  
  // ✅ Add missing properties for API compatibility
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  apiKey: process.env.WIX_API_KEY || 'dev-mode',
  
  // Available Backend Functions
  ENDPOINTS: {
    USER_MEMORY: 'userMemory',
    TEST: 'test',
    HEALTH: 'test', // Basic health check
    COMPREHENSIVE_TEST: 'test?version=comprehensive&includeAI=true'
  },
  
  // Headers for Wix App API calls
  getHeaders: (additionalHeaders = {}) => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Wix-App-ID': '@deepfreediving/kovaldeepai-app',
    'X-App-Version': '4.x',
    ...additionalHeaders
  }),
  
  // Helper function to make Wix App API calls
  makeRequest: async (endpoint: string, options: RequestInit = {}) => {
    const url = `${WIX_APP_CONFIG.FUNCTIONS_BASE_URL}/${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...WIX_APP_CONFIG.getHeaders(),
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`Wix App API Error: ${response.status} - ${response.statusText}`);
    }
    
    return response.json();
  },
  
  // User Memory specific operations
  userMemory: {
    get: async (userId: string, includeDetails = false) => {
      return WIX_APP_CONFIG.makeRequest(
        `${WIX_APP_CONFIG.ENDPOINTS.USER_MEMORY}?userId=${userId}&includeDetails=${includeDetails}`
      );
    },
    
    save: async (userId: string, diveLogData: any) => {
      return WIX_APP_CONFIG.makeRequest(
        WIX_APP_CONFIG.ENDPOINTS.USER_MEMORY,
        {
          method: 'POST',
          body: JSON.stringify({ userId, diveLogData })
        }
      );
    }
  },
  
  // Test operations
  test: {
    health: async () => {
      return WIX_APP_CONFIG.makeRequest(WIX_APP_CONFIG.ENDPOINTS.HEALTH);
    },
    
    comprehensive: async () => {
      return WIX_APP_CONFIG.makeRequest(WIX_APP_CONFIG.ENDPOINTS.COMPREHENSIVE_TEST);
    },
    
    userMemory: async (userId: string) => {
      return WIX_APP_CONFIG.userMemory.get(userId, true);
    }
  }
};

export default WIX_APP_CONFIG;
