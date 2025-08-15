#!/usr/bin/env node

/**
 * ✅ V6.0 IMAGE UPLOAD FIELD MAPPING TEST
 * Test the updated upload-dive-image endpoint with nickname field mapping
 */

import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import path from 'path';

const PRODUCTION_API = "https://kovaldeepai-main.vercel.app";
const LOCAL_API = "http://localhost:3000";

// Use production for testing
const TEST_API = PRODUCTION_API;

console.log("🧪 V6.0 IMAGE UPLOAD FIELD MAPPING TEST");
console.log("========================================");

async function testImageUploadEndpoint() {
  try {
    console.log("\n🔍 Testing image upload endpoint field mapping...");
    
    // Create a simple test image buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
      0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
      0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const formData = new FormData();
    formData.append('image', testImageBuffer, {
      filename: 'test-dive-profile.png',
      contentType: 'image/png'
    });
    formData.append('nickname', 'test-user-v6'); // ✅ Using nickname field
    formData.append('diveLogId', `test-${Date.now()}`);
    
    console.log("📤 Sending request with nickname field mapping...");
    
    const response = await fetch(`${TEST_API}/api/openai/upload-dive-image`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.status === 500) {
      const errorText = await response.text();
      console.log("❌ 500 Error Response:", errorText);
      return false;
    }
    
    if (response.ok) {
      const result = await response.json();
      console.log("✅ Upload successful with new field mapping!");
      console.log("📊 Response data:", {
        success: result.success,
        message: result.message ? result.message.substring(0, 100) + "..." : "No message",
        imageUrl: result.data?.imageUrl ? "Present" : "Missing",
        processingTime: result.metadata?.processingTime || "Unknown"
      });
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log("❌ Upload failed:", response.status, errorData);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Test error:", error.message);
    return false;
  }
}

async function testBackwardCompatibility() {
  try {
    console.log("\n🔄 Testing backward compatibility with userId field...");
    
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02,
      0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
      0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const formData = new FormData();
    formData.append('image', testImageBuffer, {
      filename: 'test-dive-profile-legacy.png',
      contentType: 'image/png'
    });
    formData.append('userId', 'legacy-user-v6'); // ✅ Using legacy userId field
    formData.append('diveLogId', `legacy-${Date.now()}`);
    
    console.log("📤 Sending request with legacy userId field...");
    
    const response = await fetch(`${TEST_API}/api/openai/upload-dive-image`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (response.status === 500) {
      const errorText = await response.text();
      console.log("❌ Backward compatibility failed:", errorText);
      return false;
    }
    
    if (response.ok) {
      const result = await response.json();
      console.log("✅ Backward compatibility works!");
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log("❌ Backward compatibility failed:", response.status, errorData);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Backward compatibility test error:", error.message);
    return false;
  }
}

async function runTests() {
  console.log(`🎯 Testing API: ${TEST_API}`);
  
  const results = {
    nicknameField: false,
    backwardCompatibility: false
  };
  
  // Test new nickname field mapping
  results.nicknameField = await testImageUploadEndpoint();
  
  // Test backward compatibility
  results.backwardCompatibility = await testBackwardCompatibility();
  
  console.log("\n📊 TEST RESULTS:");
  console.log("================");
  console.log(`✅ Nickname field mapping: ${results.nicknameField ? "PASS" : "FAIL"}`);
  console.log(`✅ Backward compatibility: ${results.backwardCompatibility ? "PASS" : "FAIL"}`);
  
  const allPassed = results.nicknameField && results.backwardCompatibility;
  
  console.log(`\n🎯 Overall result: ${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);
  
  if (allPassed) {
    console.log("\n🚀 The image upload endpoint is working correctly with the new field mapping!");
    console.log("   • Accepts 'nickname' field for new requests");
    console.log("   • Falls back to 'userId' field for legacy requests");
    console.log("   • No more 500 errors expected for field mapping issues");
  } else {
    console.log("\n⚠️ Some tests failed. The 500 error may persist.");
  }
  
  return allPassed;
}

// Run the tests
runTests().catch(console.error);
