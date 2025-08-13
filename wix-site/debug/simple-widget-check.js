// Simple Widget Check - Browser Console Safe
// Copy and paste this entire block into the browser console

(function() {
    console.log('🔍 Simple Widget Status Check');
    console.log('=============================');

    // Check for widget elements
    const widgetSelectors = ['#koval-ai', '#htmlComponent1', '#html1'];
    let foundElements = [];

    widgetSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            foundElements.push({
                selector: selector,
                element: element,
                isVisible: element.offsetWidth > 0 && element.offsetHeight > 0,
                bounds: element.getBoundingClientRect(),
                innerHTML: element.innerHTML
            });
        }
    });

    console.log(`📊 Found ${foundElements.length} widget elements:`);
    
    foundElements.forEach((item, index) => {
        console.log(`\n${index + 1}. Element: ${item.selector}`);
        console.log(`   Visible: ${item.isVisible ? '✅ Yes' : '❌ No'}`);
        console.log(`   Dimensions: ${item.bounds.width}x${item.bounds.height}`);
        console.log(`   Position: ${item.bounds.left}, ${item.bounds.top}`);
        console.log(`   HTML Length: ${item.innerHTML.length} chars`);
        
        if (item.innerHTML.includes('iframe')) {
            console.log(`   ✅ Contains iframe`);
            
            // Check iframe src
            const iframe = item.element.querySelector('iframe');
            if (iframe) {
                console.log(`   🔗 Iframe src: ${iframe.src}`);
                console.log(`   📏 Iframe size: ${iframe.offsetWidth}x${iframe.offsetHeight}`);
            }
        } else {
            console.log(`   ❌ No iframe found`);
        }
        
        // Highlight the element
        item.element.style.border = '3px solid red';
        item.element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    });

    // Check for any iframes on the page
    const allIframes = document.querySelectorAll('iframe');
    console.log(`\n📺 Total iframes on page: ${allIframes.length}`);
    
    allIframes.forEach((iframe, index) => {
        console.log(`   ${index + 1}. ${iframe.src || 'No src'}`);
        if (iframe.src && iframe.src.includes('kovaldeepai')) {
            console.log(`      ✅ This is our widget!`);
            iframe.style.border = '3px solid green';
        }
    });

    // Check for Wix elements
    if (typeof $w !== 'undefined') {
        console.log('\n🌀 Wix environment detected');
        try {
            const wixElement = $w('#koval-ai');
            if (wixElement) {
                console.log('✅ Wix element accessible via $w("#koval-ai")');
            }
        } catch (e) {
            console.log('❌ Cannot access Wix element:', e.message);
        }
    } else {
        console.log('\n❌ Not in Wix environment ($w not available)');
    }

    return {
        foundElements: foundElements,
        totalIframes: allIframes.length,
        summary: `Found ${foundElements.length} widget elements, ${allIframes.length} total iframes`
    };
})();
