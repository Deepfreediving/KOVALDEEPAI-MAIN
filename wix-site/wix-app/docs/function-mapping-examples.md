# Wix Backend Function Mapping Examples

This document explains how the frontend calls backend functions and how the backend responds.

## Function Mapping

| Frontend Call              | Backend Wrapper    | Backend HTTP Function  |
| -------------------------- | ------------------ | ---------------------- |
| `backend.chat()`           | `chat()`           | `post_chat()`          |
| `backend.wixConnection()`  | `wixConnection()`  | `post_wixConnection()` |
| `backend.diveLogs()`       | `diveLogs()`       | `post_diveLogs()`      |
| `backend.getUserProfile()` | `getUserProfile()` | `get_memberProfile()`  |
| `backend.saveUserMemory()` | `saveUserMemory()` | `post_userMemory()`    |
| `backend.test()`           | `test()`           | `post_test()`          |

## How It Works

### Before Fix

```javascript
// Frontend tried to call:
await backend.chat(requestData);

// Backend only had:
export async function post_chat(request) { ... }

// Result: Function not found → 'Unexpected end of JSON input'
```

### After Fix

```javascript
// Frontend calls:
await backend.chat(requestData);

// Backend now has both:
export async function post_chat(request) { ... }      // Original HTTP function
export async function chat(requestData) { ... }       // New wrapper function

// Result: Function found → Valid JSON response ✅
```

### Wrapper Function Example

```javascript
// Frontend calls:
const result = await backend.chat({ userMessage: "Hello", userId: "123" });

// Wrapper function receives this and creates a mock HTTP request:
export async function chat(requestData) {
  const mockRequest = {
    body: {
      json: () => Promise.resolve(requestData), // { userMessage: "Hello", userId: "123" }
    },
    headers: {},
    query: {},
  };

  // Calls the original HTTP function:
  const result = await post_chat(mockRequest);

  // Returns just the data (not the full HTTP response):
  return result.body || result; // ✅ Valid JSON object
}
```

## Testing

The backend functions are now properly mapped for direct frontend calls!
