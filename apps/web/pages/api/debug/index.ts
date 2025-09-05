/**
 * 🔧 VERCEL DEBUG DASHBOARD
 * 
 * Central hub for all diagnostic endpoints
 */

import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000';
  
  const debugEndpoints = [
    {
      name: "🔍 Comprehensive System Debug",
      endpoint: "/api/debug/vercel-debug",
      description: "Full system diagnostic including environment, APIs, and database",
      method: "GET"
    },
    {
      name: "🖼️ Image Analysis Debug",
      endpoint: "/api/debug/image-debug",
      description: "Test image upload, OpenAI vision, and Supabase storage",
      method: "GET (basic) / POST (with image)"
    },
    {
      name: "💾 Save Operations Debug",
      endpoint: "/api/debug/save-debug",
      description: "Test dive log and journal saving pipelines",
      method: "GET"
    },
    {
      name: "🛣️ Path Audit",
      endpoint: "/api/debug/path-audit",
      description: "Original path resolution diagnostic",
      method: "GET"
    }
  ];

  const quickTests = [
    {
      name: "Chat with Knowledge Retrieval",
      endpoint: "/api/chat/general",
      testData: {
        message: "what are the 4 rules of direct supervision",
        userId: "debug-user"
      }
    },
    {
      name: "Pinecone Knowledge Query",
      endpoint: "/api/pinecone/pineconequery-gpt",
      testData: {
        query: "4 rules of direct supervision",
        returnChunks: true
      }
    }
  ];

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vercel Debug Dashboard</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            background: #000;
            color: #fff;
            line-height: 1.6;
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .section { 
            margin-bottom: 30px;
            background: #111;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #333;
        }
        .endpoint { 
            background: #222; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 5px;
            border-left: 4px solid #0070f3;
        }
        .endpoint h3 { 
            margin: 0 0 10px 0; 
            color: #0070f3;
        }
        .endpoint p { 
            margin: 5px 0; 
            color: #ccc;
        }
        .test-button { 
            background: #0070f3; 
            color: white; 
            padding: 8px 16px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 5px 5px 0 0;
        }
        .test-button:hover { 
            background: #0051a2; 
        }
        .quick-test {
            background: #1a1a2e;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 4px solid #16213e;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-unknown { background: #666; }
        .status-success { background: #00ff00; }
        .status-error { background: #ff0000; }
        pre {
            background: #000;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border: 1px solid #333;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 Vercel Debug Dashboard</h1>
        <p>Comprehensive diagnostic system for KovalDeepAI production issues</p>
        <p><strong>Current URL:</strong> ${baseUrl}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    </div>

    <div class="section">
        <h2>🔍 Available Diagnostics</h2>
        <div class="grid">
            ${debugEndpoints.map(endpoint => `
                <div class="endpoint">
                    <h3>${endpoint.name}</h3>
                    <p>${endpoint.description}</p>
                    <p><strong>Method:</strong> ${endpoint.method}</p>
                    <a href="${baseUrl}${endpoint.endpoint}" class="test-button" target="_blank">
                        Test Endpoint
                    </a>
                    <button class="test-button" onclick="runTest('${endpoint.endpoint}')">
                        Run & Display
                    </button>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h2>⚡ Quick API Tests</h2>
        ${quickTests.map(test => `
            <div class="quick-test">
                <h3>${test.name}</h3>
                <p><strong>Endpoint:</strong> ${test.endpoint}</p>
                <button class="test-button" onclick="runQuickTest('${test.endpoint}', ${JSON.stringify(test.testData).replace(/"/g, '&quot;')})">
                    Test Now
                </button>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>📊 Test Results</h2>
        <div id="results">
            <p>Click any test button above to see results here...</p>
        </div>
    </div>

    <script>
        async function runTest(endpoint) {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '<p>⏳ Running test...</p>';
            
            try {
                const response = await fetch('${baseUrl}' + endpoint);
                const data = await response.json();
                
                resultsDiv.innerHTML = \`
                    <h3>✅ Test Results for \${endpoint}</h3>
                    <p><strong>Status:</strong> \${response.status} \${response.ok ? '✅' : '❌'}</p>
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                \`;
            } catch (error) {
                resultsDiv.innerHTML = \`
                    <h3>❌ Test Failed for \${endpoint}</h3>
                    <p><strong>Error:</strong> \${error.message}</p>
                \`;
            }
        }

        async function runQuickTest(endpoint, testData) {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '<p>⏳ Running quick test...</p>';
            
            try {
                const response = await fetch('${baseUrl}' + endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testData)
                });
                const data = await response.json();
                
                resultsDiv.innerHTML = \`
                    <h3>\${response.ok ? '✅' : '❌'} Quick Test Results for \${endpoint}</h3>
                    <p><strong>Status:</strong> \${response.status}</p>
                    <p><strong>Test Data:</strong> \${JSON.stringify(testData)}</p>
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                \`;
            } catch (error) {
                resultsDiv.innerHTML = \`
                    <h3>❌ Quick Test Failed for \${endpoint}</h3>
                    <p><strong>Error:</strong> \${error.message}</p>
                    <p><strong>Test Data:</strong> \${JSON.stringify(testData)}</p>
                \`;
            }
        }

        // Auto-refresh status every 30 seconds
        setInterval(() => {
            document.querySelector('.header p:last-child').textContent = 'Timestamp: ' + new Date().toISOString();
        }, 30000);
    </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
