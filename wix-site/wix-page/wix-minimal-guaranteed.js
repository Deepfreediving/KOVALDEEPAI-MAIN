// ===== 🚀 KOVAL AI WIDGET - MINIMAL GUARANTEED VERSION =====
// This version is designed to ALWAYS work, even if authentication fails
// Copy this entire code into your Wix page and it will display the widget

$w.onReady(function () {
    console.log("🚀 Koval AI Widget - Minimal Version Starting...");
    
    // ===== STEP 1: FIND WIDGET ELEMENT =====
    var widget = null;
    var widgetIds = ['#koval-ai', '#KovalAiWidget', '#htmlComponent1', '#html1', '#html2'];
    
    for (var i = 0; i < widgetIds.length; i++) {
        try {
            var testWidget = $w(widgetIds[i]);
            if (testWidget) {
                widget = testWidget;
                console.log("✅ Found widget element:", widgetIds[i]);
                break;
            }
        } catch (e) {
            console.log("⏭️ Trying next widget ID...");
        }
    }
    
    if (!widget) {
        console.error("❌ CRITICAL: No widget element found!");
        console.error("💡 Solution: Add an HTML element with ID 'koval-ai' in Wix editor");
        return;
    }
    
    // ===== STEP 2: CREATE WIDGET IFRAME =====
    try {
        var widgetUrl = 'https://kovaldeepai-main.vercel.app/embed?' +
            'embedded=true&' +
            'theme=auto&' +
            'source=wix-minimal&' +
            'v=' + Date.now();
        
        var iframeHtml = 
            '<div style="width: 100%; height: 600px; background: #f8fafc; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">' +
                '<iframe ' +
                    'src="' + widgetUrl + '" ' +
                    'style="width: 100%; height: 100%; border: none;" ' +
                    'allow="camera; microphone; clipboard-write" ' +
                    'sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups">' +
                '</iframe>' +
            '</div>';
        
        widget.html = iframeHtml;
        
        console.log("✅ WIDGET CREATED SUCCESSFULLY!");
        console.log("🔗 Widget URL:", widgetUrl);
        console.log("🎉 Koval AI should now be visible on your page");
        
    } catch (error) {
        console.error("❌ Widget creation failed:", error);
        
        // ===== EMERGENCY FALLBACK =====
        try {
            widget.html = '<div style="padding: 20px; text-align: center; background: #fee; border: 2px solid #fcc; border-radius: 8px;">' +
                '<h3>🔧 Koval AI Widget</h3>' +
                '<p>Widget element found but iframe creation failed.</p>' +
                '<p>Error: ' + error.message + '</p>' +
                '<p><a href="https://kovaldeepai-main.vercel.app/embed" target="_blank">Open Koval AI in New Tab</a></p>' +
                '</div>';
        } catch (e) {
            console.error("❌ Even fallback failed:", e);
        }
    }
    
    // ===== STEP 3: BASIC MESSAGE HANDLING (OPTIONAL) =====
    try {
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('message', function(event) {
                if (event.origin === 'https://kovaldeepai-main.vercel.app') {
                    console.log("📨 Message from Koval AI:", event.data.type || 'unknown');
                }
            });
        }
    } catch (e) {
        console.log("ℹ️ Message handling not available");
    }
    
    console.log("🏁 Minimal widget initialization complete");
});

// ===== DIAGNOSTIC HELPER FUNCTION =====
function checkWidget() {
    console.log("🔍 Checking widget status...");
    
    // Check if iframe exists
    var iframe = document.querySelector('iframe[src*="kovaldeepai-main.vercel.app"]');
    if (iframe) {
        console.log("✅ Widget iframe found");
        console.log("📐 Iframe size:", iframe.offsetWidth + "x" + iframe.offsetHeight);
        console.log("🔗 Iframe src:", iframe.src);
    } else {
        console.log("❌ Widget iframe not found");
    }
    
    // Check widget element
    var widgetIds = ['#koval-ai', '#KovalAiWidget', '#htmlComponent1', '#html1'];
    widgetIds.forEach(function(id) {
        try {
            var element = $w(id);
            if (element) {
                console.log("✅ Widget element " + id + " exists");
            }
        } catch (e) {
            console.log("❌ Widget element " + id + " not found");
        }
    });
}

// Make diagnostic function available globally
if (typeof window !== 'undefined') {
    window.checkWidget = checkWidget;
}

console.log("✅ Minimal Koval AI widget code loaded");
console.log("💡 If widget doesn't appear, run: checkWidget()");
