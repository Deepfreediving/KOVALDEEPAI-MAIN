// Add this to browser console to inspect localStorage for dive logs

function debugLocalStorage() {
  console.log("=== LOCALSTORAGE DIVE LOGS DEBUG ===");
  
  // Get current userId
  const userId = localStorage.getItem("kovalUser");
  console.log("Current userId:", userId);
  
  // Check all keys that might contain dive logs
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    allKeys.push(localStorage.key(i));
  }
  
  console.log("All localStorage keys:", allKeys);
  
  // Check dive log related keys
  const diveLogKeys = allKeys.filter(key => 
    key.includes('dive') || key.includes('Dive') || key.includes('log') || key.includes('Log')
  );
  
  console.log("Dive log related keys:", diveLogKeys);
  
  diveLogKeys.forEach(key => {
    const value = localStorage.getItem(key);
    try {
      const parsed = JSON.parse(value);
      console.log(`${key}:`, Array.isArray(parsed) ? `${parsed.length} items` : typeof parsed, parsed);
    } catch (e) {
      console.log(`${key}:`, typeof value, value.substring(0, 100));
    }
  });
  
  // Specific key check
  if (userId) {
    const expectedKey = `diveLogs_${userId}`;
    const value = localStorage.getItem(expectedKey);
    console.log(`Expected key ${expectedKey}:`, value);
    
    if (value) {
      try {
        const parsed = JSON.parse(value);
        console.log(`Parsed ${expectedKey}:`, parsed);
      } catch (e) {
        console.log(`Failed to parse ${expectedKey}:`, e);
      }
    }
  }
}

// Run it
debugLocalStorage();
