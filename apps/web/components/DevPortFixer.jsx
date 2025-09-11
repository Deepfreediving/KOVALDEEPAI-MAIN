// 🛠️ Development Helper - Fix Port Redirection Issues
// This component helps detect and fix common development port issues

import { useEffect } from 'react';

export default function DevPortFixer() {
  useEffect(() => {
    // Check if we're on the wrong port and redirect
    if (typeof window !== 'undefined') {
      const currentPort = window.location.port;
      
      if (currentPort === '3001' && process.env.NODE_ENV === 'development') {
        console.log('🔄 Detected wrong port, redirecting to correct port...');
        const newUrl = window.location.href.replace(':3001', ':3000');
        window.location.replace(newUrl);
      }
    }
  }, []);

  return null; // This component doesn't render anything
}

// Also export a helper function for API calls
export function getCorrectApiUrl(path) {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = process.env.NODE_ENV === 'development' ? '3000' : window.location.port;
    
    return `${protocol}//${hostname}:${port}${path}`;
  }
  return path; // Fallback to relative path
}
