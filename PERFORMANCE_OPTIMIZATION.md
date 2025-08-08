# 🚀 Performance Optimization Guide

## Problem Analysis

The application was experiencing DOM bloat with 51+ script and link elements in the body, causing:

- Slower initial rendering
- Increased page load times
- Poor Core Web Vitals scores
- Suboptimal user experience

## Solutions Implemented

### 1. Document Structure Optimization (`_document.js`)

✅ **Moved critical resources to `<head>`**

- Stylesheets and meta tags properly positioned
- DNS prefetching for external APIs
- Critical CSS inlined for faster rendering
- Preload directives for important assets

✅ **Script loading optimization**

- NextScript positioned optimally
- Duplicate script cleanup
- Performance monitoring integration

### 2. Performance Optimizer Component

✅ **DOM cleanup automation**

- Removes duplicate stylesheets and meta tags
- Moves misplaced styles from body to head
- Optimizes image loading with lazy loading

✅ **Script management**

- Defers non-critical scripts
- Monitors loading performance
- Implements scroll optimizations

### 3. Next.js Configuration Updates

✅ **Bundle optimization**

- Better code splitting strategy
- Vendor chunk separation
- Deterministic chunk IDs for caching

✅ **Compiler optimizations**

- CSS optimization enabled
- Console removal in production
- Modular imports for tree shaking

### 4. Optimized Script Loader

✅ **Priority-based loading**

- High/Medium/Low priority queues
- Idle callback utilization
- Duplicate prevention

## Usage Examples

### Loading External Scripts

```jsx
import OptimizedScriptLoader from "../components/OptimizedScriptLoader";

const scripts = [
  { src: "/critical-script.js", priority: "high" },
  { src: "/analytics.js", priority: "low" },
  { src: "/widget.js", priority: "medium", defer: true },
];

<OptimizedScriptLoader
  scripts={scripts}
  onLoad={(src) => console.log("Loaded:", src)}
/>;
```

### Using Script Hook

```jsx
import { useScriptLoader } from "../components/OptimizedScriptLoader";

function MyComponent() {
  useScriptLoader("/external-lib.js", {
    defer: true,
    onLoad: () => console.log("Library ready!"),
  });
}
```

## Performance Monitoring

The optimization includes automatic performance monitoring:

- **DOM Content Loaded** timing
- **Largest Contentful Paint** measurement
- **Script loading** performance
- **Duplicate resource** detection

## Best Practices

### ✅ DO:

- Use `next/script` with proper strategy when possible
- Load non-critical scripts with `defer` or `async`
- Implement resource hints (preload, prefetch, dns-prefetch)
- Monitor Core Web Vitals regularly
- Use code splitting for large bundles

### ❌ DON'T:

- Add scripts directly to document.body
- Load large scripts synchronously
- Ignore duplicate resources
- Skip performance monitoring
- Use inline scripts for large code blocks

## Expected Improvements

After implementing these optimizations:

- **Reduced DOM nodes** by ~20-30%
- **Faster First Contentful Paint** (FCP)
- **Improved Largest Contentful Paint** (LCP)
- **Better Time to Interactive** (TTI)
- **Enhanced user experience** scores

## Monitoring Commands

```bash
# Bundle analysis
npm run analyze

# Performance audit
npm run lighthouse

# Build size check
npm run build && du -sh .next/
```

## Browser Compatibility

These optimizations are designed to:

- Work across modern browsers
- Gracefully degrade in older browsers
- Maintain functionality while improving performance
- Follow web standards and best practices

## Critical Production Issues & Fixes

### Backend Connection Failures

❌ **Current Issue**: `https://www.deepfreediving.com/_functions/wixConnection` returning 500 errors

✅ **Solution**: 
```javascript
// Implement robust backend connection with fallback
const testBackendConnection = async () => {
  try {
    const response = await fetch('/_functions/wixConnection', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`Backend failed: ${response.status}`);
      // Implement fallback logic
      return { status: 'fallback', timestamp: new Date().toISOString() };
    }
    
    return { status: 'connected', timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('Backend connection error:', error);
    return { status: 'offline', timestamp: new Date().toISOString() };
  }
};
```

### CORS Configuration

❌ **Current Issue**: Cross-origin requests blocked between Wix and Vercel

✅ **Solution**: Update Next.js API routes with proper CORS headers:
```javascript
// pages/api/analyze/[...slug].ts
export default async function handler(req, res) {
  // Set CORS headers for Wix integration
  res.setHeader('Access-Control-Allow-Origin', 'https://www.deepfreediving.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Your existing API logic
}
```

### Cross-Origin Communication Fix

❌ **Current Issue**: SecurityError accessing `window.KOVAL_USER_DATA`

✅ **Solution**: Implement secure postMessage communication:
```javascript
// Wix Page Code - Send user data to widget
function sendUserDataToWidget(userData) {
  const iframe = document.querySelector('iframe[src*="kovaldeepai-main.vercel.app"]');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'USER_AUTH_DATA',
      data: userData,
      timestamp: Date.now()
    }, 'https://kovaldeepai-main.vercel.app');
  }
}

// Widget Code - Receive user data
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://www.deepfreediving.com') return;
  
  if (event.data.type === 'USER_AUTH_DATA') {
    console.log('✅ Received user data from Wix:', event.data.data);
    // Process authenticated user data
  }
});
```

### Wix Dataset API Fixes

❌ **Current Issue**: `$w(...).setFilter is not a function`

✅ **Solution**: Proper dataset API usage:
```javascript
// Correct Wix dataset implementation
$w.onReady(() => {
  const userMemoryDataset = $w('#UserMemoryDataset');
  
  // Check if dataset exists and has required methods
  if (userMemoryDataset && typeof userMemoryDataset.setFilter === 'function') {
    userMemoryDataset.setFilter(wixData.filter().eq('userId', currentUserId));
    
    userMemoryDataset.onReady(() => {
      console.log('✅ Dataset ready');
    });
  } else {
    console.warn('⚠️ Dataset not available, using alternative data source');
    // Implement fallback data retrieval
  }
});
```

### Performance Monitoring Enhancement

✅ **Real-time error tracking**:
```javascript
// Enhanced error monitoring
class PerformanceMonitor {
  constructor() {
    this.errors = [];
    this.metrics = {};
    this.setupErrorTracking();
  }
  
  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.logError('JavaScript Error', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason);
    });
  }
  
  logError(type, error) {
    const errorData = {
      type,
      message: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    this.errors.push(errorData);
    console.error(`🚨 ${type}:`, errorData);
    
    // Send to monitoring service
    this.sendToMonitoring(errorData);
  }
  
  sendToMonitoring(errorData) {
    // Implement error reporting to your monitoring service
    fetch('/api/monitoring/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    }).catch(err => console.warn('Failed to send error report:', err));
  }
}

// Initialize monitoring
const monitor = new PerformanceMonitor();
```

---

_Generated: August 7, 2025_
_Version: 1.0_

---

_Updated: August 8, 2025_
_Version: 1.1 - Critical Production Fixes_
