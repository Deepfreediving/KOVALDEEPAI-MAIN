export default function AdminSimple() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>KovalAI Admin - Simple Version</h1>
      <p>This is a simplified admin page to test basic functionality.</p>
      
      <h2>Navigation Links</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <a 
          href="/?admin=true&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium"
          style={{ 
            padding: '10px', 
            backgroundColor: '#0070f3', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '5px',
            textAlign: 'center'
          }}
        >
          🏠 Main App Dashboard
        </a>
        
        <a 
          href="/?admin=true&mode=chat&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium"
          style={{ 
            padding: '10px', 
            backgroundColor: '#6366f1', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '5px',
            textAlign: 'center'
          }}
        >
          💬 AI Freediving Coach
        </a>
        
        <a 
          href="/?admin=true&mode=dive-journal&userName=Daniel%20Koval%20(Admin)&userId=admin-daniel-koval&subscription=premium"
          style={{ 
            padding: '10px', 
            backgroundColor: '#06b6d4', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '5px',
            textAlign: 'center'
          }}
        >
          📊 Dive Journal & Analysis
        </a>
        
        <a 
          href="/auth/login"
          style={{ 
            padding: '10px', 
            backgroundColor: '#6b7280', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '5px',
            textAlign: 'center'
          }}
        >
          🔐 Regular Login
        </a>
      </div>
      
      <h2>Test Status</h2>
      <p>✅ If you can see this page, the basic routing is working!</p>
      <p>✅ The links above should take you to the main app with admin privileges</p>
    </div>
  );
}
