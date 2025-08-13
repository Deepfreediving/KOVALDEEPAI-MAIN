// ===== 🔍 LIVE SITE WIDGET DIAGNOSTIC =====
// Run this in browser console on: https://www.deepfreediving.com/large-koval-deep-ai-page

function checkLiveWidgetStatus() {
    console.log('🔍 Checking live widget status...');
    console.log('=====================================');
    
    // 1. Check if widget element exists
    console.log('\n1. 🎯 Widget Element Check:');
    const widgetIds = ['#koval-ai', '#KovalAiWidget', '#htmlComponent1', '#html1', '#html2'];
    let foundWidget = null;
    
    widgetIds.forEach(id => {
        try {
            const element = $w && $w(id);
            if (element) {
                console.log(`   ✅ Found widget: ${id}`);
                foundWidget = { id, element };
                
                // Check widget content
                try {
                    const html = element.html;
                    console.log(`   📝 HTML length: ${html ? html.length : 0} characters`);
                    console.log(`   🖼️ Contains iframe: ${html ? html.includes('iframe') : false}`);
                    console.log(`   🔗 Contains Vercel URL: ${html ? html.includes('kovaldeepai-main.vercel.app') : false}`);
                    
                    // Show actual HTML content if it's small
                    if (html && html.length < 1000) {
                        console.log(`   📄 Full HTML content:`);
                        console.log(`   ${html}`);
                    } else if (html && html.length >= 1000) {
                        console.log(`   📄 HTML preview (first 200 chars):`);
                        console.log(`   ${html.substring(0, 200)}...`);
                    }
                    
                    // Check widget visibility properties
                    console.log(`   👁️ Widget hidden: ${element.hidden || false}`);
                    console.log(`   🎨 Widget collapsed: ${element.collapsed || false}`);
                    
                } catch (e) {
                    console.log(`   ⚠️ Could not read widget HTML: ${e.message}`);
                }
            }
        } catch (e) {
            console.log(`   ❌ ${id}: Not found`);
        }
    });
    
    // 2. Check for iframe presence in DOM
    console.log('\n2. 🖼️ Iframe Check:');
    const iframes = document.querySelectorAll('iframe');
    console.log(`   📊 Total iframes on page: ${iframes.length}`);
    
    let kovalIframe = null;
    iframes.forEach((iframe, index) => {
        if (iframe.src && iframe.src.includes('kovaldeepai-main.vercel.app')) {
            console.log(`   ✅ Found Koval AI iframe #${index + 1}:`);
            console.log(`      🔗 URL: ${iframe.src}`);
            console.log(`      📐 Size: ${iframe.offsetWidth}x${iframe.offsetHeight}`);
            console.log(`      👁️ Visible: ${iframe.offsetWidth > 0 && iframe.offsetHeight > 0}`);
            kovalIframe = iframe;
        }
    });
    
    if (!kovalIframe) {
        console.log('   ❌ No Koval AI iframe found');
    }
    
    // 3. Test CORS connectivity
    console.log('\n3. 🌐 CORS Connectivity Test:');
    fetch('https://kovaldeepai-main.vercel.app/api/system/vercel-handshake', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: 'live-diagnostic-user',
            sessionId: 'live-diagnostic-session',
            timestamp: Date.now(),
            userAgent: 'Live-Site-Diagnostic'
        })
    })
    .then(response => {
        console.log(`   ✅ CORS Response: ${response.status} ${response.statusText}`);
        return response.json();
    })
    .then(result => {
        console.log('   🎉 CORS SUCCESS! Backend is accessible');
        console.log('   📊 Response:', result);
    })
    .catch(error => {
        console.log('   ❌ CORS Error:', error.message);
    });
    
    // 4. Check for widget initialization logs
    console.log('\n4. 📋 Recent Console Activity:');
    console.log('   Look above for these success indicators:');
    console.log('   ✅ "Found widget with ID: #koval-ai"');
    console.log('   ✅ "Widget initialized successfully"');
    console.log('   ✅ "Session management initialized"');
    console.log('   ✅ "Vercel handshake successful"');
    
    // 5. Widget interaction test
    if (foundWidget) {
        console.log('\n5. 🧪 Widget Interaction Test:');
        try {
            // Try to send a test message to the widget
            if (window.postMessage) {
                const testMessage = {
                    type: 'DIAGNOSTIC_PING',
                    source: 'live-site-diagnostic',
                    timestamp: Date.now()
                };
                
                if (kovalIframe && kovalIframe.contentWindow) {
                    kovalIframe.contentWindow.postMessage(testMessage, 'https://kovaldeepai-main.vercel.app');
                    console.log('   📤 Test message sent to widget');
                }
            }
        } catch (e) {
            console.log('   ⚠️ Widget interaction test failed:', e.message);
        }
    }
    
    // 6. Advanced DOM Analysis
    console.log('\n6. 🔬 Advanced DOM Analysis:');
    if (foundWidget) {
        try {
            // Try to get the actual DOM element
            const widgetId = foundWidget.id.replace('#', '');
            const domElement = document.getElementById(widgetId);
            
            if (domElement) {
                console.log(`   ✅ Found DOM element: ${widgetId}`);
                console.log(`   📐 Element size: ${domElement.offsetWidth}x${domElement.offsetHeight}`);
                console.log(`   👁️ Element visible: ${domElement.offsetWidth > 0 && domElement.offsetHeight > 0}`);
                console.log(`   🎨 Display style: ${window.getComputedStyle(domElement).display}`);
                console.log(`   🔍 Visibility style: ${window.getComputedStyle(domElement).visibility}`);
                console.log(`   📍 Position: ${window.getComputedStyle(domElement).position}`);
                console.log(`   🏠 Parent element: ${domElement.parentElement ? domElement.parentElement.tagName : 'none'}`);
                
                // Check if element has any content
                const innerHTML = domElement.innerHTML;
                console.log(`   📝 Inner HTML length: ${innerHTML ? innerHTML.length : 0}`);
                
                if (innerHTML && innerHTML.length < 500) {
                    console.log(`   📄 Inner HTML content:`);
                    console.log(`   ${innerHTML}`);
                }
                
            } else {
                console.log(`   ❌ DOM element ${widgetId} not found in document`);
                
                // Try to find it by different methods
                const allDivs = document.querySelectorAll('div');
                let foundByContent = false;
                
                allDivs.forEach((div, index) => {
                    if (div.innerHTML && div.innerHTML.includes('kovaldeepai-main.vercel.app')) {
                        console.log(`   ✅ Found element with Koval content at index ${index}:`);
                        console.log(`      🏷️ ID: ${div.id || 'no-id'}`);
                        console.log(`      📐 Size: ${div.offsetWidth}x${div.offsetHeight}`);
                        console.log(`      👁️ Visible: ${div.offsetWidth > 0 && div.offsetHeight > 0}`);
                        foundByContent = true;
                    }
                });
                
                if (!foundByContent) {
                    console.log(`   ❌ No elements found containing Koval content`);
                }
            }
            
        } catch (e) {
            console.log(`   ⚠️ DOM analysis failed: ${e.message}`);
        }
    }
    
    // 7. Summary
    console.log('\n7. 📊 SUMMARY:');
    console.log('=====================================');
    if (foundWidget) {
        console.log('   🎯 Widget Element: ✅ FOUND');
    } else {
        console.log('   ❌ Widget Element: NOT FOUND');
    }
    
    if (kovalIframe) {
        console.log('   🖼️ Widget Iframe: ✅ LOADED');
        console.log('   🎨 Widget Visible: ✅ YES');
    } else {
        console.log('   ❌ Widget Iframe: NOT FOUND');
    }
    
    console.log('\n💡 If widget is not visible:');
    console.log('   1. Check if you have the latest code deployed');
    console.log('   2. Refresh the page (Ctrl+F5)');
    console.log('   3. Check Wix editor for widget element configuration');
    console.log('   4. Ensure widget element ID is "koval-ai"');
    
    console.log('\n🔧 Quick Fix Command (if needed):');
    console.log('   forceCreateWidget()');
}

// Force create widget function
function forceCreateWidget() {
    console.log('🔧 Force creating widget...');
    
    const widgetIds = ['#koval-ai', '#htmlComponent1', '#html1'];
    let targetWidget = null;
    
    for (let id of widgetIds) {
        try {
            const widget = $w && $w(id);
            if (widget) {
                targetWidget = widget;
                console.log(`✅ Using widget element: ${id}`);
                break;
            }
        } catch (e) {
            // Continue to next ID
        }
    }
    
    if (!targetWidget) {
        console.error('❌ No widget element found to use');
        return;
    }
    
    const widgetUrl = 'https://kovaldeepai-main.vercel.app/embed?' +
        'embedded=true&' +
        'theme=auto&' +
        'source=wix-force-create&' +
        'v=' + Date.now();
    
    const iframeHtml = 
        '<div style="width: 100%; height: 600px; background: #f8fafc; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">' +
            '<iframe ' +
                'src="' + widgetUrl + '" ' +
                'style="width: 100%; height: 100%; border: none;" ' +
                'allow="camera; microphone; clipboard-write" ' +
                'sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups">' +
            '</iframe>' +
        '</div>';
    
    try {
        targetWidget.html = iframeHtml;
        console.log('✅ Widget force-created successfully!');
        console.log('🔗 Widget URL:', widgetUrl);
        
        // Run diagnostic again after 3 seconds
        setTimeout(() => {
            console.log('\n🔍 Re-running diagnostic after force creation...');
            checkLiveWidgetStatus();
        }, 3000);
        
    } catch (error) {
        console.error('❌ Force creation failed:', error);
    }
}

// Quick visual check function
function quickVisualCheck() {
    console.log('👀 Quick Visual Check...');
    console.log('========================');
    
    // Check all iframes on page
    const allIframes = document.querySelectorAll('iframe');
    console.log(`📊 Total iframes on page: ${allIframes.length}`);
    
    allIframes.forEach((iframe, index) => {
        console.log(`\n🖼️ Iframe #${index + 1}:`);
        console.log(`   🔗 Source: ${iframe.src}`);
        console.log(`   📐 Size: ${iframe.offsetWidth}x${iframe.offsetHeight}`);
        console.log(`   👁️ Visible: ${iframe.offsetWidth > 0 && iframe.offsetHeight > 0}`);
        console.log(`   🎨 Display: ${window.getComputedStyle(iframe).display}`);
        
        if (iframe.src.includes('kovaldeepai-main.vercel.app')) {
            console.log(`   🎯 This is the Koval AI iframe!`);
            
            // Try to highlight it visually
            iframe.style.border = '3px solid red';
            iframe.style.backgroundColor = 'yellow';
            console.log(`   🔴 Added red border and yellow background for visibility`);
            
            // Remove highlighting after 5 seconds
            setTimeout(() => {
                iframe.style.border = '';
                iframe.style.backgroundColor = '';
                console.log(`   ✨ Removed highlighting`);
            }, 5000);
        }
    });
    
    // Check for elements with koval-ai id
    const kovalElement = document.getElementById('koval-ai');
    if (kovalElement) {
        console.log(`\n✅ Found koval-ai element:`);
        console.log(`   📐 Size: ${kovalElement.offsetWidth}x${kovalElement.offsetHeight}`);
        console.log(`   📍 Position: ${kovalElement.getBoundingClientRect().top}, ${kovalElement.getBoundingClientRect().left}`);
        console.log(`   🎨 Background: ${window.getComputedStyle(kovalElement).background}`);
        
        // Highlight the widget area
        kovalElement.style.border = '5px solid blue';
        kovalElement.style.minHeight = '600px';
        console.log(`   🔵 Added blue border to widget area`);
        
        setTimeout(() => {
            kovalElement.style.border = '';
        }, 5000);
    } else {
        console.log(`\n❌ No element with ID 'koval-ai' found`);
    }
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.checkLiveWidgetStatus = checkLiveWidgetStatus;
    window.forceCreateWidget = forceCreateWidget;
    window.quickVisualCheck = quickVisualCheck;
}

console.log('🔍 Live site diagnostic loaded!');
console.log('📋 Available commands:');
console.log('   checkLiveWidgetStatus() - Full diagnostic');
console.log('   quickVisualCheck() - Quick visual check with highlighting');
console.log('   forceCreateWidget() - Force create widget if needed');
console.log('');
console.log('🚀 Start with: quickVisualCheck()');
