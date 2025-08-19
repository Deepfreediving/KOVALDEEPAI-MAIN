// Comprehensive runtime debugging and hardening
(function() {
  'use strict';
  
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  // Enhanced error tracking
  window.KOVAL_DEBUG = {
    errors: [],
    warnings: [],
    authState: null,
    initTime: Date.now()
  };
  
  // Catch and log all errors with context
  console.error = function(...args) {
    const errorInfo = {
      timestamp: Date.now(),
      type: 'error',
      message: args.join(' '),
      stack: new Error().stack,
      url: window.location.href
    };
    
    window.KOVAL_DEBUG.errors.push(errorInfo);
    
    // Check for specific error patterns
    if (args.join(' ').includes('Cannot access') && args.join(' ').includes('before initialization')) {
      console.warn('🔍 DETECTED: Early variable access error - possible module loading issue');
      console.warn('🔧 SUGGESTED FIX: Check for circular imports or variable hoisting');
    }
    
    return originalError.apply(console, args);
  };
  
  // Catch React errors
  window.addEventListener('error', function(event) {
    window.KOVAL_DEBUG.errors.push({
      timestamp: Date.now(),
      type: 'runtime_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  });
  
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    window.KOVAL_DEBUG.errors.push({
      timestamp: Date.now(),
      type: 'promise_rejection',
      message: event.reason?.message || 'Unhandled Promise Rejection',
      stack: event.reason?.stack
    });
  });
  
  // Helper function to get debug report
  window.getKovalDebugReport = function() {
    return {
      ...window.KOVAL_DEBUG,
      runtime: Date.now() - window.KOVAL_DEBUG.initTime,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  };
  
  // Authentication state tracking
  window.setAuthState = function(state) {
    window.KOVAL_DEBUG.authState = {
      state,
      timestamp: Date.now()
    };
  };
  
  console.log('🔧 Koval AI Debug System initialized');
  
})();
