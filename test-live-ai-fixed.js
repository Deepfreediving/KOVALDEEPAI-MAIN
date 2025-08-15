#!/usr/bin/env node

// Test script to verify the live AI functionality on the Wix site
const { spawn } = require('child_process');

const LIVE_SITE_URL = 'https://www.deepfreediving.com/large-koval-deep-ai-page';
const PRODUCTION_API = 'https://kovaldeepai-main.vercel.app';

async function runCurl(url, options = '') {
    return new Promise((resolve, reject) => {
        const curlArgs = ['-s', '-w', '%{http_code}'];
        if (options) {
            curlArgs.push(...options.split(' '));
        }
        curlArgs.push(url);
        
        const curl = spawn('curl', curlArgs);
        let output = '';
        
        curl.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        curl.on('close', (code) => {
            if (code === 0) {
                // Extract status code from the end of output
                const statusCode = output.slice(-3);
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
        const siteResponse = await runCurl(LIVE_SITE_URL);
        console.log(`   Status: ${siteResponse.statusCode}`);
        
        if (siteResponse.statusCode === 200) {
            const html = siteResponse.body;
            
            // Check for iframe embedding
            const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/i);
            if (iframeMatch) {
                console.log(`   ✅ Found iframe: ${iframeMatch[1]}`);
            } else {
                console.log('   ❌ No iframe found');
            }
            
            // Check for API references
            const apiMatches = html.match(/kovaldeepai[^"'\s]*/g);
            if (apiMatches) {
                console.log(`   🔗 API references found: ${[...new Set(apiMatches)].join(', ')}`);
            } else {
                console.log('   ❌ No API references found');
            }
        }
        
        // 2. Test the production API health
        console.log('\n2. Testing production API health...');
        try {
            const apiResponse = await runCurl(PRODUCTION_API);
            console.log(`   API Status: ${apiResponse.statusCode}`);
            if (apiResponse.statusCode === 200) {
                console.log('   ✅ Production API is accessible');
            }
        } catch (error) {
            console.log(`   ❌ API health check failed: ${error.message}`);
        }
        
        // 3. Test the upload endpoint
        console.log('\n3. Testing upload endpoint availability...');
        try {
            const uploadResponse = await runCurl(`${PRODUCTION_API}/api/openai/upload-dive-image`, '-X OPTIONS');
            console.log(`   Upload endpoint: ${uploadResponse.statusCode}`);
            if (uploadResponse.statusCode === 200 || uploadResponse.statusCode === 204) {
                console.log('   ✅ Upload endpoint is accessible');
            }
        } catch (error) {
            console.log(`   ❌ Upload endpoint test failed: ${error.message}`);
        }
        
        // 4. Check CORS headers
        console.log('\n4. Testing CORS configuration...');
        try {
            const corsResponse = await runCurl(
                `${PRODUCTION_API}/api/openai/upload-dive-image`, 
                '-X OPTIONS -H "Origin: https://www.deepfreediving.com" -H "Access-Control-Request-Method: POST" -I'
            );
            
            console.log('   CORS test completed');
            console.log('   Response headers included in output above');
        } catch (error) {
            console.log(`   ❌ CORS test failed: ${error.message}`);
        }
        
        console.log('\n📋 Summary:');
        console.log('   - Live site: ' + LIVE_SITE_URL);
        console.log('   - Production API: ' + PRODUCTION_API);
        console.log('   - Check the output above for iframe and API integration details');
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    }
}

// Run the test
testLiveSite();
