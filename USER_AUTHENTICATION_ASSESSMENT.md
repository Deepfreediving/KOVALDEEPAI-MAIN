# 🔐 User Authentication Assessment Report

## Current Authentication Status: **PARTIALLY IMPLEMENTED** ⚠️

### ✅ **What Your Project Does Well:**

#### 1. **Wix Frontend Authentication (Strong)**

Your `wix-frontend-page-master.js` correctly implements Wix user authentication:

```javascript
// ✅ CORRECT: Checks user login status
if (!wixUsers.currentUser.loggedIn) {
  await wixUsers.promptLogin();
}

// ✅ CORRECT: Retrieves user information
const userId = wixUsers.currentUser.id;
const userEmail = wixUsers.currentUser.loginEmail;
const displayName = wixUsers.currentUser.displayName;
```

#### 2. **User Data Collection**

- Properly retrieves user email via `getEmail()` method
- Collects comprehensive user profile data
- Uses `currentMember.getMember()` for detailed information

#### 3. **OAuth Flow Implementation**

- Has proper OAuth callback and status checking
- Token refresh mechanism implemented
- Error handling for authentication failures

#### 4. **PostMessage Communication**

- Sends authenticated user data to embedded widgets
- Handles guest fallback appropriately

### ❌ **Critical Issues Found:**

#### 1. **Inconsistent User ID Management**

Your Next.js app sometimes defaults to guest users instead of checking Wix authentication:

```javascript
// ❌ PROBLEM: Default guest user without checking Wix first
setUserId(localStorage.getItem("kovalUser") || `guest-${Date.now()}`);
```

#### 2. **Missing UserMemory Query Implementation**

Your code doesn't follow the example pattern you provided:

```javascript
// ❌ MISSING: This pattern from your request
wixData
  .query("UserMemory")
  .eq("email", email)
  .find()
  .then((results) => {
    if (results.items.length > 0) {
      const userData = results.items[0];
      console.log("User data:", userData);
    }
  });
```

#### 3. **Authentication State Not Persisted**

The Next.js app doesn't maintain authentication state between sessions properly.

## 🛠️ **Recommended Fixes**

### 1. **Enhanced User Authentication Hook**

Create a comprehensive authentication system:

```typescript
// hooks/useUserAuthentication.ts
import { useEffect, useState } from "react";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isAuthenticated: boolean;
  userMemoryData?: any;
}

export function useUserAuthentication() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // 1. Check if running in Wix context
      if (typeof window !== "undefined" && window.parent !== window) {
        // Request user data from parent Wix site
        window.parent.postMessage({ type: "REQUEST_USER_DATA" }, "*");

        // Listen for response
        const handleMessage = (event) => {
          if (event.data.type === "USER_DATA_RESPONSE") {
            const userData = event.data.userData;
            if (userData && !userData.userId.startsWith("guest")) {
              setUser({
                id: userData.userId,
                email: userData.profile?.loginEmail || "",
                displayName: userData.profile?.displayName || "User",
                isAuthenticated: true,
                userMemoryData: userData,
              });
            }
            setLoading(false);
          }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
      }

      // 2. Fallback: Check local authentication
      const response = await fetch("/api/auth/check-user");
      const authData = await response.json();

      if (authData.authenticated) {
        setUser(authData.user);
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, checkAuthentication };
}
```

### 2. **User Memory Query API**

Implement the missing UserMemory collection query:

```typescript
// pages/api/auth/get-user-memory.ts
import { NextApiRequest, NextApiResponse } from "next";
import { fetchUserMemory } from "@/lib/userMemoryManager";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { userId, email } = req.query;

    if (!userId && !email) {
      return res.status(400).json({ error: "userId or email required" });
    }

    // Query UserMemory collection
    let userMemory = null;

    if (userId) {
      userMemory = await fetchUserMemory(userId as string);
    } else if (email) {
      // Query by email if userId not available
      userMemory = await queryUserMemoryByEmail(email as string);
    }

    if (userMemory) {
      return res.status(200).json({
        success: true,
        data: userMemory,
        message: "User memory data retrieved",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "User not found in collection",
      });
    }
  } catch (error) {
    console.error("Error querying UserMemory collection:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to query user memory",
    });
  }
}
```

### 3. **Enhanced Frontend User Detection**

Update your main page to properly detect authenticated users:

```javascript
// In pages/index.jsx - replace current user detection
useEffect(() => {
  const initializeUser = async () => {
    try {
      // 1. Check for URL parameters (Wix embed)
      const { userId: urlUserId, userName } = router.query;

      if (urlUserId && !String(urlUserId).startsWith("guest")) {
        console.log("✅ Authenticated user from URL:", urlUserId);
        setUserId(String(urlUserId));

        // Fetch user memory data
        const memoryResponse = await fetch(
          `/api/auth/get-user-memory?userId=${urlUserId}`
        );
        if (memoryResponse.ok) {
          const memoryData = await memoryResponse.json();
          setProfile(memoryData.data.profile || {});
        }
        return;
      }

      // 2. Check postMessage from parent (Wix)
      const messageHandler = (event) => {
        if (event.data.type === "USER_AUTH" && event.data.data) {
          const userData = event.data.data;
          if (!userData.isGuest && userData.userId) {
            console.log(
              "✅ Authenticated user from postMessage:",
              userData.userId
            );
            setUserId(userData.userId);
            setProfile(userData);
            return;
          }
        }
      };

      window.addEventListener("message", messageHandler);

      // Request user data from parent
      if (window.parent !== window) {
        window.parent.postMessage({ type: "REQUEST_USER_DATA" }, "*");
      }

      // 3. Fallback to guest user
      setTimeout(() => {
        if (!userId) {
          const guestId = `guest-${Date.now()}`;
          console.log("ℹ️ No authenticated user found, using guest:", guestId);
          setUserId(guestId);
        }
      }, 2000);

      return () => window.removeEventListener("message", messageHandler);
    } catch (error) {
      console.error("User initialization error:", error);
      setUserId(`guest-${Date.now()}`);
    }
  };

  initializeUser();
}, [router.query]);
```

## 🔍 **Debugging Steps**

Add these debug statements to verify authentication:

```javascript
// Add to your Wix frontend page
console.log("🔍 User Authentication Debug:");
console.log("- Logged in:", wixUsers.currentUser.loggedIn);
console.log("- User ID:", wixUsers.currentUser.id);
console.log("- Email:", wixUsers.currentUser.loginEmail);
console.log("- Display Name:", wixUsers.currentUser.displayName);

// Query UserMemory collection
wixData
  .query("UserMemory")
  .eq("userId", wixUsers.currentUser.id)
  .find()
  .then((results) => {
    console.log("📊 UserMemory Query Results:", results.items);
    if (results.items.length > 0) {
      console.log("✅ User found in collection:", results.items[0]);
    } else {
      console.log("❌ User not found in UserMemory collection");
    }
  });
```

## 📊 **Expected Behavior After Fixes**

1. **Authenticated Users**: Should see their real name and have access to their data
2. **Guest Users**: Only used when no authentication is available
3. **UserMemory Collection**: Should be queried and populated correctly
4. **Consistent State**: Authentication should persist across page reloads

## 🎯 **Next Steps**

1. Implement the enhanced authentication hook
2. Add the UserMemory query API endpoint
3. Update the frontend user detection logic
4. Add comprehensive debug logging
5. Test with real Wix users

Your foundation is solid, but these enhancements will make the authentication robust and reliable! 🚀
