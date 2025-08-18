// ===== 🔍 WIX WIDGET DIAGNOSTIC SCRIPT =====
// Copy-paste this entire script into your Wix site code editor
// Then call: runDiagnostic() from the browser console

function runDiagnostic() {
    console.log("🔍 Starting Koval AI Widget Diagnostic...");
    console.log("====================================");
    
    // 1. Check if basic Wix functions are available
    console.log("\n1. ✅ Checking Wix Environment:");
    console.log("   - $w available:", typeof $w !== 'undefined');
    console.log("   - wixData available:", typeof wixData !== 'undefined');
    console.log("   - wixStorage available:", typeof wixStorage !== 'undefined');
    
    // 2. Search for potential widget elements
    console.log("\n2. 🔍 Searching for Widget Elements:");
    var widgetIds = [
        '#koval-ai',
        '#KovalAiWidget', 
        '#kovalAIWidget',
        '#KovalAIWidget',
        '#htmlComponent1',
        '#html1',
        '#htmlComponent2',
        '#html2'
    ];
    
    var foundWidget = null;
    widgetIds.forEach(function(id) {
        try {
            var element = $w(id);
            if (element) {
                console.log("   ✅ Found element:", id);
                foundWidget = element;
            }
        } catch (e) {
            console.log("   ❌ Not found:", id);
        }
    });
    
    // 3. Check current HTML content of found widget
    if (foundWidget) {
        console.log("\n3. 📋 Widget Content Analysis:");
        try {
            var currentHtml = foundWidget.html;
            console.log("   - Current HTML length:", currentHtml ? currentHtml.length : 0);
            console.log("   - Contains iframe:", currentHtml ? currentHtml.includes('iframe') : false);
            console.log("   - Contains Vercel URL:", currentHtml ? currentHtml.includes('kovaldeepai-main.vercel.app') : false);
            if (currentHtml && currentHtml.length < 500) {
                console.log("   - Full HTML:", currentHtml);
            }
        } catch (e) {
            console.log("   ❌ Could not read widget HTML:", e.message);
        }
    } else {
        console.log("\n3. ❌ No widget found - cannot analyze content");
    }
    
    // 4. Test iframe creation manually
    console.log("\n4. 🧪 Testing Manual Widget Creation:");
    if (foundWidget) {
        try {
            var testUrl = 'https://kovaldeepai-main.vercel.app/embed?diagnostic=true&v=' + Date.now();
            var testIframe = '<iframe src="' + testUrl + '" style="width: 100%; height: 500px; border: none;"></iframe>';
            
            foundWidget.html = testIframe;
            console.log("   ✅ Test iframe created successfully");
            console.log("   🔗 Test URL:", testUrl);
            
            setTimeout(function() {
                console.log("   ⏰ Widget should now be visible. Check the page!");
            }, 2000);
            
        } catch (e) {
            console.log("   ❌ Manual widget creation failed:", e.message);
        }
    }
    
    // 5. Test CORS connectivity
    console.log("\n5. 🌐 Testing CORS Connectivity:");
    fetch('https://kovaldeepai-main.vercel.app/api/system/vercel-handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: 'diagnostic-test',
            timestamp: Date.now(),
            userAgent: 'Diagnostic-Script'
        })
    })
    .then(function(response) {
        console.log("   ✅ CORS Test - Response status:", response.status);
        return response.json();
    })
    .then(function(result) {
        console.log("   ✅ CORS working! Response:", result);
    })
    .catch(function(error) {
        console.log("   ❌ CORS Error:", error.message);
    });
    
    console.log("\n====================================");
    console.log("🏁 Diagnostic complete! Check results above.");
    console.log("💡 If widget still not showing, the issue is likely:");
    console.log("   1. Widget ID mismatch in Wix editor");
    console.log("   2. Code not properly saved/published on Wix");
    console.log("   3. Need to refresh page after code update");
}

// Make function globally available
if (typeof window !== 'undefined') {
    window.runDiagnostic = runDiagnostic;
}

console.log("🔍 Diagnostic script loaded. Run: runDiagnostic()");
