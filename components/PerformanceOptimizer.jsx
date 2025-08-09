// ===== 📄 components/PerformanceOptimizer.jsx =====
// Component to optimize script loading and DOM performance

import { useEffect } from 'react';

const PerformanceOptimizer = () => {
  useEffect(() => {
    const optimizations = {
      // ✅ Defer non-critical scripts
      deferNonCriticalScripts: () => {
        if (typeof window === 'undefined') return;
        
        // Move non-critical scripts to the end of body
        const scripts = document.querySelectorAll('script[src]');
        const criticalScripts = ['next', 'webpack', 'main', 'polyfill'];
        
        scripts.forEach(script => {
          const src = script.src;
          const isCritical = criticalScripts.some(critical => src.includes(critical));
          
          if (!isCritical && !script.async && !script.defer) {
            script.defer = true;
            console.log('⚡ Deferred script:', src);
          }
        });
      },

      // ✅ Clean up duplicate elements
      removeDuplicateElements: () => {
        if (typeof window === 'undefined') return;
        
        // Remove duplicate stylesheets
        const styleSheets = document.querySelectorAll('link[rel="stylesheet"]');
        const seenHrefs = new Set();
        
        styleSheets.forEach(link => {
          if (seenHrefs.has(link.href)) {
            link.remove();
            console.log('🧹 Removed duplicate stylesheet:', link.href);
          } else {
            seenHrefs.add(link.href);
          }
        });
        
        // Remove duplicate meta tags
        const metaTags = document.querySelectorAll('meta[name], meta[property]');
        const seenMetas = new Set();
        
        metaTags.forEach(meta => {
          const key = meta.name || meta.getAttribute('property');
          if (seenMetas.has(key)) {
            meta.remove();
            console.log('🧹 Removed duplicate meta tag:', key);
          } else {
            seenMetas.add(key);
          }
        });
      },

      // ✅ Optimize image loading
      optimizeImages: () => {
        if (typeof window === 'undefined') return;
        
        const images = document.querySelectorAll('img:not([loading])');
        images.forEach(img => {
          // Add lazy loading to images below the fold
          const rect = img.getBoundingClientRect();
          if (rect.top > window.innerHeight) {
            img.loading = 'lazy';
          }
        });
      },

      // ✅ Move stylesheets to head if they're in body
      moveStylesToHead: () => {
        if (typeof window === 'undefined') return;
        
        const bodyStyles = document.body.querySelectorAll('link[rel="stylesheet"], style');
        const head = document.head;
        
        bodyStyles.forEach(style => {
          // Check if it's not already in head
          const existing = head.querySelector(`[href="${style.href}"]`) || 
                          head.querySelector(`style[data-href="${style.href}"]`);
          
          if (!existing && style.parentNode === document.body) {
            head.appendChild(style);
            console.log('📝 Moved stylesheet to head:', style.href || 'inline');
          }
        });
      },

      // ✅ Optimize scroll performance
      optimizeScrolling: () => {
        if (typeof window === 'undefined') return;
        
        // Add passive event listeners for better scroll performance
        let ticking = false;
        
        const optimizedScroll = () => {
          if (!ticking) {
            requestAnimationFrame(() => {
              // Scroll optimizations can go here
              ticking = false;
            });
            ticking = true;
          }
        };
        
        window.addEventListener('scroll', optimizedScroll, { passive: true });
        
        return () => {
          window.removeEventListener('scroll', optimizedScroll);
        };
      },

      // ✅ Monitor performance
      monitorPerformance: () => {
        if (typeof window === 'undefined' || !window.performance) return;
        
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              console.log('📊 Page Load Performance:', {
                domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                loadComplete: entry.loadEventEnd - entry.loadEventStart,
                firstPaint: entry.loadEventEnd - entry.fetchStart
              });
            }
            
            if (entry.entryType === 'largest-contentful-paint') {
              console.log('🎨 Largest Contentful Paint:', entry.startTime + 'ms');
            }
          });
        });
        
        try {
          observer.observe({ entryTypes: ['navigation', 'largest-contentful-paint'] });
        } catch (e) {
          console.warn('Performance Observer not supported');
        }
        
        return () => observer.disconnect();
      }
    };

    // ✅ Run optimizations
    const cleanup = [];
    
    // Immediate optimizations
    optimizations.removeDuplicateElements();
    optimizations.moveStylesToHead();
    optimizations.optimizeImages();
    
    // Deferred optimizations
    setTimeout(() => {
      optimizations.deferNonCriticalScripts();
      cleanup.push(optimizations.optimizeScrolling());
      cleanup.push(optimizations.monitorPerformance());
    }, 100);

    // ✅ Cleanup on unmount
    return () => {
      cleanup.forEach(fn => fn && fn());
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceOptimizer;
