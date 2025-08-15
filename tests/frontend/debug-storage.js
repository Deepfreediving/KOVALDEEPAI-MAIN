// Debug script to check localStorage keys
console.log("=== LOCALSTORAGE DEBUG ===");

// Check all localStorage keys
console.log("All localStorage keys:");
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`${key}:`, value.length > 100 ? `${value.substring(0, 100)}...` : value);
}

// Check specific keys
console.log("\n=== SPECIFIC KEYS ===");
console.log("kovalSessionsList:", localStorage.getItem("kovalSessionsList"));
console.log("kovalUser:", localStorage.getItem("kovalUser"));

// Check for dive log keys
console.log("\n=== DIVE LOG KEYS ===");
const userId = localStorage.getItem("kovalUser");
if (userId) {
  const diveLogKey = `diveLogs_${userId}`;
  console.log(`${diveLogKey}:`, localStorage.getItem(diveLogKey));
  
  // Check legacy keys too
  const legacyKeys = [
    `diveLogs-${userId}`,
    `diveLogs_${userId}`,
    "koval_ai_logs",
    "kovalDiveLogs"
  ];
  
  legacyKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      console.log(`Found legacy key ${key}:`, value.length > 100 ? `${value.substring(0, 100)}...` : value);
    }
  });
} else {
  console.log("No userId found in localStorage");
}
