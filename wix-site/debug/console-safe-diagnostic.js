// ===== 🔍 LIVE SITE WIDGET DIAGNOSTIC - CONSOLE SAFE =====
// Copy and paste this entire block into browser console

(function() {
    'use strict';
    
    // Main diagnostic function
    window.checkLiveWidgetStatus = function() {
        console.log('🔍 Checking live widget status...');
        console.log('=====================================');
        
        // 1. Check if widget element exists
        console.log('\n1. 🎯 Widget Element Check:');
        const widgetIds = ['#koval-ai', '#KovalAiWidget', '#htmlComponent1', '#html1', '#html2'];
        let foundWidget = null;
        
        widgetIds.forEach(id => {
            try {
                const element = document.querySelector(id);
                if (element) {
                    console.log(`   ✅ Found widget: ${id}`);
                    foundWidget = { id, element };
                    
                    // Check widget content
                    try {
                        const html = element.innerHTML;
                        console.log(`   📝 HTML length: ${html ? html.length : 0} characters`);
                        console.log(`   🖼️ Contains iframe: ${html ? html.includes('iframe') : false}`);
                        console.log(`   🔗 Contains Vercel URL: ${html ? html.includes('kovaldeepai-main.vercel.app') : false}`);
                        
                        // Show content preview
                        if (html && html.length < 1000) {
                            console.log(`   📄 Full HTML:`);
                            console.log(`   ${html}`);
                        } else if (html && html.length >= 1000) {
                            console.log(`   📄 HTML Preview (first 200 chars):`);
                            console.log(`   ${html.substring(0, 200)}...`);
                        }
                        
                        // Highlight the element
                        element.style.border = '3px solid red';
                        element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                        console.log(`   🎨 Element highlighted with red border`);
                        
                    } catch (contentError) {
                        console.warn(`   ⚠️ Could not access content: ${contentError.message}`);
                    }
                } else {
                    console.log(`   ❌ Not found: ${id}`);
                }
            } catch (error) {
                console.log(`   ❌ Error checking ${id}: ${error.message}`);
            }
        });
        
        // 2. Check for iframes
        console.log('\n2. 🖼️ Iframe Check:');
        const allIframes = document.querySelectorAll('iframe');
        console.log(`   📊 Total iframes found: ${allIframes.length}`);
        
        let kovalIframe = null;
        allIframes.forEach((iframe, index) => {
            const src = iframe.src || 'No src attribute';
            console.log(`   ${index + 1}. ${src}`);
            
            if (src.includes('kovaldeepai') || src.includes('vercel.app')) {
                console.log(`      ✅ This looks like our widget!`);
                kovalIframe = iframe;
                
                // Highlight Koval iframe
                iframe.style.border = '3px solid green';
                iframe.style.boxShadow = '0 0 10px green';
                
                // Check iframe properties
                console.log(`      📏 Dimensions: ${iframe.offsetWidth}x${iframe.offsetHeight}`);
                console.log(`      👁️ Visible: ${iframe.offsetWidth > 0 && iframe.offsetHeight > 0 ? 'Yes' : 'No'}`);
                console.log(`      🎭 Display: ${getComputedStyle(iframe).display}`);
            }
        });
        
        // 3. Check Wix environment
        console.log('\n3. 🌀 Wix Environment Check:');
        if (typeof $w !== 'undefined') {
            console.log('   ✅ Wix environment detected ($w available)');
            
            try {
                const wixWidget = $w('#koval-ai');
                console.log('   ✅ $w("#koval-ai") accessible');
                
                // Try to get Wix widget properties
                try {
                    console.log(`   📊 Wix widget type: ${typeof wixWidget}`);
                    if (wixWidget && wixWidget.html !== undefined) {
                        console.log(`   📝 Wix widget HTML length: ${wixWidget.html.length}`);
                    }
                } catch (propError) {
                    console.log(`   ⚠️ Cannot access Wix widget properties: ${propError.message}`);
                }
            } catch (wixError) {
                console.log(`   ❌ Cannot access $w("#koval-ai"): ${wixError.message}`);
            }
        } else {
            console.log('   ❌ Not in Wix environment ($w not available)');
        }
        
        // 4. Summary and recommendations
        console.log('\n4. 📋 Summary:');
        
        if (foundWidget) {
            console.log(`   ✅ Widget element found: ${foundWidget.id}`);
            
            if (kovalIframe) {
                console.log(`   ✅ Koval iframe detected and working`);
                console.log(`   🎉 Widget appears to be loaded successfully!`);
            } else {
                console.log(`   ⚠️ Widget element found but no Koval iframe detected`);
                console.log(`   💡 Widget may be loading or have configuration issues`);
            }
        } else {
            console.log(`   ❌ No widget element found`);
            console.log(`   💡 Widget may not be added to the page or has different ID`);
        }
        
        console.log('\n🔧 Quick Fix Commands:');
        console.log('   quickVisualCheck() - Visual check with highlighting');
        console.log('   forceCreateWidget() - Force create widget if needed');
        
        return {
            widgetFound: !!foundWidget,
            iframeFound: !!kovalIframe,
            totalIframes: allIframes.length,
            wixEnvironment: typeof $w !== 'undefined'
        };
    };
    
    // Quick visual check function
    window.quickVisualCheck = function() {
        console.log('👀 Quick Visual Check...');
        console.log('========================');
        
        // Check all iframes on page
        const allIframes = document.querySelectorAll('iframe');
        console.log(`📊 Total iframes on page: ${allIframes.length}`);
        
        allIframes.forEach((iframe, index) => {
            const rect = iframe.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0 && 
                             rect.top < window.innerHeight && rect.bottom > 0;
            
            console.log(`${index + 1}. ${iframe.src || 'No source'}`);
            console.log(`   Size: ${rect.width}x${rect.height}`);
            console.log(`   Visible: ${isVisible ? '✅ Yes' : '❌ No'}`);
            
            if (iframe.src && iframe.src.includes('kovaldeepai')) {
                console.log(`   🎯 This is our Koval AI widget!`);
                iframe.style.border = '3px solid lime';
                iframe.style.boxShadow = '0 0 15px lime';
                
                // Scroll to widget if not visible
                if (!isVisible) {
                    console.log(`   📜 Scrolling to widget...`);
                    iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
        
        // Check for widget containers
        const containers = document.querySelectorAll('#koval-ai, #htmlComponent1, #html1');
        console.log(`\n📦 Widget containers found: ${containers.length}`);
        
        containers.forEach((container, index) => {
            container.style.border = '2px dashed orange';
            container.style.backgroundColor = 'rgba(255, 165, 0, 0.1)';
            console.log(`${index + 1}. Container highlighted: ${container.id || container.className}`);
        });
        
        if (containers.length === 0 && allIframes.length === 0) {
            console.log('\n❌ No widget or iframes found on this page!');
            console.log('💡 Try running forceCreateWidget() to create the widget');
        }
    };
    
    // Force create widget function
    window.forceCreateWidget = function() {
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
    };
    
    // Auto-run basic check
    console.log('🔍 Live site diagnostic loaded!');
    console.log('📋 Available commands:');
    console.log('   checkLiveWidgetStatus() - Full diagnostic');
    console.log('   quickVisualCheck() - Quick visual check with highlighting');
    console.log('   forceCreateWidget() - Force create widget if needed');
    console.log('');
    console.log('🚀 Start with: quickVisualCheck()');
    
})();
