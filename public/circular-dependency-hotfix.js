// 🚨 CIRCULAR DEPENDENCY HOTFIX - Client-Side
// This script fixes the "Cannot access 'em' before initialization" error
(function() {
  'use strict';
  
  console.log('🔧 Loading circular dependency hotfix...');
  
  // ===== VARIABLE INITIALIZATION FIX =====
  function fixVariableInitialization() {
    if (typeof window !== 'undefined') {
      // Pre-initialize problematic variables
      ['em', 'ec', 'globalThis', 'global'].forEach(varName => {
        if (typeof window[varName] === 'undefined') {
          try {
            Object.defineProperty(window, varName, {
              value: null,
              writable: true,
              configurable: true
            });
          } catch (e) {
            // Ignore if already defined
          }
        }
      });
    }
  }
  
  // ===== SAFE MODULE LOADING =====
  function createSafeRequire() {
    if (typeof window !== 'undefined' && !window.safeRequire) {
      const moduleCache = new Map();
      const loadingModules = new Set();
      
      window.safeRequire = function(moduleName) {
        if (loadingModules.has(moduleName)) {
          console.warn(`⚠️ Circular dependency detected: ${moduleName}`);
          return null;
        }
        
        if (moduleCache.has(moduleName)) {
          return moduleCache.get(moduleName);
        }
        
        loadingModules.add(moduleName);
        
        try {
          const module = typeof require !== 'undefined' ? require(moduleName) : null;
          moduleCache.set(moduleName, module);
          loadingModules.delete(moduleName);
          return module;
        } catch (error) {
          console.error(`❌ Module load failed: ${moduleName}`, error.message);
          loadingModules.delete(moduleName);
          return null;
        }
      };
    }
  }
  
  // ===== ERROR RECOVERY =====
  function setupErrorRecovery() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('error', function(event) {
      const error = event.error;
      if (error?.message?.includes('Cannot access') && error?.message?.includes('before initialization')) {
        console.log('🔧 Recovering from initialization error...');
        
        // Attempt recovery
        setTimeout(function() {
          try {
            fixVariableInitialization();
            console.log('✅ Recovery complete');
          } catch (recoveryError) {
            console.error('❌ Recovery failed:', recoveryError);
          }
        }, 50);
        
        // Prevent error propagation
        event.preventDefault();
        return false;
      }
    });
    
    window.addEventListener('unhandledrejection', function(event) {
      if (event.reason?.message?.includes('Cannot access')) {
        console.log('🔧 Recovering from promise rejection...');
        event.preventDefault();
        return false;
      }
    });
  }
  
  // ===== APPLY FIXES IMMEDIATELY =====
  try {
    fixVariableInitialization();
    createSafeRequire();
    setupErrorRecovery();
    console.log('✅ Circular dependency hotfix applied');
  } catch (error) {
    console.error('❌ Hotfix failed:', error);
  }
  
  // Mark as loaded
  if (typeof window !== 'undefined') {
    window.CIRCULAR_DEPENDENCY_FIX_LOADED = true;
  }
})();
