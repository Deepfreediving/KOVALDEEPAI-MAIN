// Test script to diagnose dive log saving issues
// Run this in the browser console to test dive log saves

console.log('🔬 Testing dive log save system...');

// Test data
const testDiveLog = {
  id: 'test_' + Date.now(),
  userId: 'test-user-123',
  date: '2024-12-20',
  discipline: 'Constant Weight',
  location: 'Test Pool',
  targetDepth: 20,
  reachedDepth: 18,
  notes: 'Test dive log from diagnosis'
};

// Test 1: Check localStorage key format
console.log('📱 Testing localStorage...');
const storageKey = `diveLogs-${testDiveLog.userId}`;
try {
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  console.log(`✅ Found ${existing.length} existing dive logs in localStorage`);
  
  // Add test log
  existing.push(testDiveLog);
  localStorage.setItem(storageKey, JSON.stringify(existing));
  
  // Verify
  const updated = JSON.parse(localStorage.getItem(storageKey) || '[]');
  console.log(`✅ localStorage test passed: ${updated.length} logs now stored`);
} catch (error) {
  console.error('❌ localStorage test failed:', error);
}

// Test 2: Check API endpoint
console.log('🌐 Testing API endpoint...');
fetch('/api/analyze/save-dive-log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testDiveLog)
})
.then(response => {
  console.log(`📥 API Response status: ${response.status}`);
  return response.json();
})
.then(result => {
  console.log('✅ API test result:', result);
})
.catch(error => {
  console.error('❌ API test failed:', error);
});

// Test 3: Check dive log loading
console.log('📋 Testing dive log loading...');
fetch(`/api/analyze/get-dive-logs?userId=${testDiveLog.userId}`)
.then(response => response.json())
.then(result => {
  console.log('📋 Loaded dive logs:', result);
})
.catch(error => {
  console.error('❌ Load test failed:', error);
});

console.log('🔬 Diagnosis complete. Check results above.');
