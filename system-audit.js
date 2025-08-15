#!/usr/bin/env node

// 🔍 COMPREHENSIVE SYSTEM AUDIT - Koval Deep AI
// Version: 1.0.0 - Root Cause Analysis
// Date: August 15, 2025

const https = require('https');
const http = require('http');

async function comprehensiveAudit() {
    console.log('🔍 COMPREHENSIVE SYSTEM AUDIT');
    console.log('=====================================\n');

    const results = {
        frontend: {},
        backend: {},
        integration: {},
        issues: []
    };

    // 1. FRONTEND AUDIT
    console.log('1. 🌐 FRONTEND AUDIT');
    console.log('─────────────────────');
    
    try {
        // Test live site accessibility
        const siteResponse = await testUrl('https://www.deepfreediving.com/large-koval-deep-ai-page');
        results.frontend.siteAccessible = siteResponse.status === 200;
        results.frontend.siteStatus = siteResponse.status;
        console.log(`   Site Status: ${siteResponse.status} ${siteResponse.statusText}`);
        
        if (siteResponse.status === 200) {
            const html = siteResponse.body;
            
            // Check for iframe
            const iframePattern = /<iframe[^>]+src=["']([^"']*kovaldeepai[^"']*)["'][^>]*>/i;
            const iframeMatch = html.match(iframePattern);
            
            results.frontend.hasIframe = !!iframeMatch;
            results.frontend.iframeSrc = iframeMatch ? iframeMatch[1] : null;
            
            console.log(`   Iframe Found: ${results.frontend.hasIframe ? '✅ Yes' : '❌ No'}`);
            if (results.frontend.iframeSrc) {
                console.log(`   Iframe Source: ${results.frontend.iframeSrc}`);
            }
            
            // Check for Wix Blocks references
            const wixBlocksPattern = /kovaldeepai|KovalAI|koval-ai/gi;
            const wixMatches = html.match(wixBlocksPattern);
            results.frontend.wixReferences = wixMatches ? wixMatches.length : 0;
            console.log(`   Wix References: ${results.frontend.wixReferences} found`);
            
            // Check for Thunderbolt (Wix framework)
            results.frontend.isWixThunderbolt = html.includes('wix-thunderbolt');
            console.log(`   Wix Thunderbolt: ${results.frontend.isWixThunderbolt ? '✅ Detected' : '❌ Not detected'}`);
            
        } else {
            results.issues.push(`Site not accessible: ${siteResponse.status}`);
        }
        
    } catch (error) {
        results.issues.push(`Frontend test failed: ${error.message}`);
        console.log(`   ❌ Error: ${error.message}`);
    }

    // 2. BACKEND API AUDIT
    console.log('\n2. 🔧 BACKEND API AUDIT');
    console.log('─────────────────────');
    
    const apiEndpoints = [
        'https://kovaldeepai-main.vercel.app/api/health',
        'https://kovaldeepai-main.vercel.app/api/openai/upload-dive-image',
        'https://kovaldeepai-main.vercel.app/embed',
        'https://www.deepfreediving.com/_functions/saveDiveLog'
    ];
    
    for (const endpoint of apiEndpoints) {
        try {
            const response = await testUrl(endpoint, { method: 'OPTIONS' });
            const name = endpoint.split('/').pop();
            
            results.backend[name] = {
                status: response.status,
                accessible: response.status < 400,
                corsHeaders: {
                    origin: response.headers['access-control-allow-origin'],
                    methods: response.headers['access-control-allow-methods'],
                    headers: response.headers['access-control-allow-headers']
                }
            };
            
            console.log(`   ${name}: ${response.status} ${response.statusText}`);
            if (response.headers['access-control-allow-origin']) {
                console.log(`     CORS Origin: ${response.headers['access-control-allow-origin']}`);
            }
            
        } catch (error) {
            results.backend[endpoint] = { error: error.message };
            console.log(`   ${endpoint}: ❌ ${error.message}`);
            results.issues.push(`API ${endpoint} failed: ${error.message}`);
        }
    }

    // 3. INTEGRATION AUDIT
    console.log('\n3. 🔗 INTEGRATION AUDIT');
    console.log('─────────────────────');
    
    // Test embed page specifically
    try {
        const embedResponse = await testUrl('https://kovaldeepai-main.vercel.app/embed?userId=test&source=audit');
        results.integration.embedAccessible = embedResponse.status === 200;
        results.integration.embedStatus = embedResponse.status;
        console.log(`   Embed Page: ${embedResponse.status} ${embedResponse.statusText}`);
        
        if (embedResponse.status === 200) {
            const embedHtml = embedResponse.body;
            
            // Check for key components in embed
            results.integration.hasUserDetection = embedHtml.includes('USER_DATA') || embedHtml.includes('userData');
            results.integration.hasFileUpload = embedHtml.includes('file') && embedHtml.includes('upload');
            results.integration.hasChat = embedHtml.includes('chat') || embedHtml.includes('message');
            
            console.log(`     User Detection: ${results.integration.hasUserDetection ? '✅' : '❌'}`);
            console.log(`     File Upload: ${results.integration.hasFileUpload ? '✅' : '❌'}`);
            console.log(`     Chat Interface: ${results.integration.hasChat ? '✅' : '❌'}`);
        }
        
    } catch (error) {
        results.issues.push(`Embed page test failed: ${error.message}`);
        console.log(`   ❌ Embed Error: ${error.message}`);
    }

    // 4. ISSUE ANALYSIS
    console.log('\n4. 🔍 ISSUE ANALYSIS');
    console.log('─────────────────────');
    
    // Analyze patterns
    const criticalIssues = [];
    const warnings = [];
    
    // Check for critical issues
    if (!results.frontend.siteAccessible) {
        criticalIssues.push('Live site not accessible');
    }
    
    if (!results.frontend.hasIframe) {
        criticalIssues.push('No iframe found - AI widget not embedded');
    }
    
    if (!results.backend['upload-dive-image']?.accessible) {
        criticalIssues.push('Upload API not accessible');
    }
    
    if (!results.integration.embedAccessible) {
        criticalIssues.push('Embed page not working');
    }
    
    // Check for warnings
    if (results.frontend.wixReferences === 0) {
        warnings.push('No Wix references found - widget may not be properly integrated');
    }
    
    if (!results.backend['upload-dive-image']?.corsHeaders?.origin) {
        warnings.push('CORS headers missing - cross-origin requests may fail');
    }
    
    console.log('\n📊 CRITICAL ISSUES:');
    if (criticalIssues.length === 0) {
        console.log('   ✅ No critical issues detected');
    } else {
        criticalIssues.forEach(issue => console.log(`   ❌ ${issue}`));
    }
    
    console.log('\n⚠️ WARNINGS:');
    if (warnings.length === 0) {
        console.log('   ✅ No warnings');
    } else {
        warnings.forEach(warning => console.log(`   ⚠️ ${warning}`));
    }

    // 5. ROOT CAUSE HYPOTHESIS
    console.log('\n5. 🎯 ROOT CAUSE HYPOTHESIS');
    console.log('─────────────────────');
    
    if (!results.frontend.hasIframe) {
        console.log('   🔴 PRIMARY ISSUE: Widget not embedded');
        console.log('   ➜ The Wix page does not contain the AI iframe');
        console.log('   ➜ This explains why sessions stay but dive logs disappear');
        console.log('   ➜ This explains why image upload doesn\'t work');
        console.log('   ➜ SOLUTION: Deploy updated Wix frontend code');
    } else if (results.frontend.iframeSrc && !results.frontend.iframeSrc.includes('kovaldeepai-main.vercel.app')) {
        console.log('   🔴 PRIMARY ISSUE: Wrong iframe source');
        console.log(`   ➜ Current: ${results.frontend.iframeSrc}`);
        console.log('   ➜ Expected: https://kovaldeepai-main.vercel.app/embed');
        console.log('   ➜ SOLUTION: Update iframe source in Wix');
    } else if (!results.backend['upload-dive-image']?.accessible) {
        console.log('   🔴 PRIMARY ISSUE: Backend API down');
        console.log('   ➜ Upload functionality cannot work if API is inaccessible');
        console.log('   ➜ SOLUTION: Check Vercel deployment status');
    } else {
        console.log('   🟡 COMPLEX ISSUE: Multiple factors');
        console.log('   ➜ All components appear functional individually');
        console.log('   ➜ Issue likely in data flow or session management');
        console.log('   ➜ SOLUTION: Deep dive into message passing between iframe and parent');
    }

    // 6. RECOMMENDED ACTIONS
    console.log('\n6. 🛠️ RECOMMENDED ACTIONS');
    console.log('─────────────────────');
    console.log('   1. ✅ Verify Wix page has latest frontend code deployed');
    console.log('   2. ✅ Check iframe src points to correct Vercel URL');
    console.log('   3. ✅ Test widget element ID matches configuration');
    console.log('   4. ✅ Verify CORS headers allow deepfreediving.com');
    console.log('   5. ✅ Test message passing between iframe and parent');
    console.log('   6. ✅ Check browser console for JavaScript errors');

    console.log('\n📋 AUDIT COMPLETE');
    console.log('=====================================');
    
    return results;
}

// Helper function to test URLs
function testUrl(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const lib = isHttps ? https : http;
        
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Koval-Audit/1.0',
                ...options.headers
            }
        };
        
        const req = lib.request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: res.headers,
                    body: body
                });
            });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => reject(new Error('Timeout')));
        req.end();
    });
}

// Run the audit
comprehensiveAudit().catch(console.error);
