#!/usr/bin/env node

// Test script to verify the live AI functionality on the Wix site
// Using built-in fetch (Node.js 18+)
const { spawn } = require('child_process');

const LIVE_SITE_URL = 'https://www.deepfreediving.com/large-koval-deep-ai-page';
const PRODUCTION_API = 'https://kovaldeepai-main.vercel.app';

async function runCurl(url, options = '') {
    return new Promise((resolve, reject) => {
        const curl = spawn('curl', ['-s', '-w', '%{http_code}', ...options.split(' '), url]);
        let output = '';
        let statusCode = '';
        
        curl.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        curl.on('close', (code) => {
            if (code === 0) {
                // Extract status code from the end of output
                statusCode = output.slice(-3);
                const body = output.slice(0, -3);
                resolve({ statusCode: parseInt(statusCode), body });
            } else {
                reject(new Error(`curl failed with code ${code}`));
            }
        });
    });
}

async function testLiveSite() {
    console.log('🔍 Testing Live Site AI Functionality...\n');
    
    try {
        // 1. Check if the live site loads
        console.log('1. Testing live site accessibility...');
        const siteResponse = await fetch(LIVE_SITE_URL);
        console.log(`   Status: ${siteResponse.status} ${siteResponse.statusText}`);
        
        if (siteResponse.ok) {
            const html = await siteResponse.text();
            
            // Check for iframe embedding
            const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/i);
            if (iframeMatch) {
                console.log(`   ✅ Found iframe: ${iframeMatch[1]}`);
            }
            
            // Check for API references
            const apiMatches = html.match(/kovaldeepai[^"'\s]*/g);
            if (apiMatches) {
                console.log(`   🔗 API references found: ${[...new Set(apiMatches)].join(', ')}`);
            }
        }
        
        // 2. Test the production API health
        console.log('\n2. Testing production API health...');
        try {
            const apiResponse = await fetch(`${PRODUCTION_API}/api/health`);
            console.log(`   API Status: ${apiResponse.status} ${apiResponse.statusText}`);
        } catch (error) {
            console.log(`   ❌ API health check failed: ${error.message}`);
        }
        
        // 3. Test the upload endpoint
        console.log('\n3. Testing upload endpoint availability...');
        try {
            const uploadResponse = await fetch(`${PRODUCTION_API}/api/openai/upload-dive-image`, {
                method: 'OPTIONS'
            });
            console.log(`   Upload endpoint: ${uploadResponse.status} ${uploadResponse.statusText}`);
        } catch (error) {
            console.log(`   ❌ Upload endpoint test failed: ${error.message}`);
        }
        
        // 4. Check CORS headers
        console.log('\n4. Testing CORS configuration...');
        try {
            const corsResponse = await fetch(`${PRODUCTION_API}/api/openai/upload-dive-image`, {
                method: 'OPTIONS',
                headers: {
                    'Origin': 'https://www.deepfreediving.com',
                    'Access-Control-Request-Method': 'POST'
                }
            });
            
            const corsHeaders = {
                'Access-Control-Allow-Origin': corsResponse.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': corsResponse.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': corsResponse.headers.get('Access-Control-Allow-Headers')
            };
            
            console.log('   CORS Headers:');
            Object.entries(corsHeaders).forEach(([key, value]) => {
                console.log(`   ${key}: ${value || 'Not set'}`);
            });
        } catch (error) {
            console.log(`   ❌ CORS test failed: ${error.message}`);
        }
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    }
}

// Run the test
testLiveSite();
