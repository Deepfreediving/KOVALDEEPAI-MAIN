// ===== 📄 components/OptimizedScriptLoader.jsx =====
// Optimized script loader with better control over external resources

import { useEffect, useRef } from 'react';

const OptimizedScriptLoader = ({ 
  scripts = [], 
  defer = true, 
  onLoad, 
  onError,
  priority = 'low' 
}) => {
  const loadedScripts = useRef(new Set());

  useEffect(() => {
    if (!scripts.length) return;

    const loadScript = (scriptConfig) => {
      return new Promise((resolve, reject) => {
        const { src, id, async = true, defer: scriptDefer = defer } = scriptConfig;
        
        // Skip if already loaded
        if (loadedScripts.current.has(src)) {
          resolve();
          return;
        }

        // Check if script already exists in DOM
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          loadedScripts.current.add(src);
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = async;
        script.defer = scriptDefer;
        
        if (id) script.id = id;

        script.onload = () => {
          loadedScripts.current.add(src);
          console.log('✅ Script loaded:', src);
          onLoad?.(src);
          resolve();
        };

        script.onerror = (error) => {
          console.error('❌ Script failed to load:', src, error);
          onError?.(src, error);
          reject(error);
        };

        // Use different loading strategies based on priority
        if (priority === 'high') {
          // High priority: load immediately
          document.head.appendChild(script);
        } else if (priority === 'medium') {
          // Medium priority: load after DOM content loaded
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
              document.head.appendChild(script);
            });
          } else {
            document.head.appendChild(script);
          }
        } else {
          // Low priority: load when browser is idle
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              document.head.appendChild(script);
            });
          } else {
            setTimeout(() => {
              document.head.appendChild(script);
            }, 100);
          }
        }
      });
    };

    // Load scripts based on priority
    const highPriorityScripts = scripts.filter(s => s.priority === 'high');
    const mediumPriorityScripts = scripts.filter(s => s.priority === 'medium');
    const lowPriorityScripts = scripts.filter(s => !s.priority || s.priority === 'low');

    // Load high priority first
    Promise.all(highPriorityScripts.map(loadScript))
      .then(() => {
        // Then medium priority
        return Promise.all(mediumPriorityScripts.map(loadScript));
      })
      .then(() => {
        // Finally low priority
        return Promise.all(lowPriorityScripts.map(loadScript));
      })
      .catch(error => {
        console.error('Script loading error:', error);
      });

    // Cleanup function to remove scripts if needed
    return () => {
      // Optional: Remove scripts on unmount if they're not needed globally
      // This is usually not recommended for performance reasons
    };
  }, [scripts, defer, onLoad, onError, priority]);

  return null; // This component doesn't render anything
};

// ✅ Hook for managing script loading
export const useScriptLoader = (src, options = {}) => {
  const { defer = true, async = true, onLoad, onError } = options;

  useEffect(() => {
    if (!src) return;

    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = src;
    script.async = async;
    script.defer = defer;

    const handleLoad = () => {
      console.log('✅ Script loaded:', src);
      onLoad?.();
    };

    const handleError = (error) => {
      console.error('❌ Script failed:', src, error);
      onError?.(error);
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      // Don't remove script element as it might be needed by other components
    };
  }, [src, defer, async, onLoad, onError]);
};

export default OptimizedScriptLoader;
