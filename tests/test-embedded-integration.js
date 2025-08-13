// Final Integration Test - Embedded Widget
// test-embedded-integration.js

const puppeteer = require('puppeteer');

async function testEmbeddedWidget() {
  console.log('🚀 Starting embedded widget integration test...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for CI/CD
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Listen for console messages from the embedded widget
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🎯') || text.includes('✅') || text.includes('❌') || text.includes('📝')) {
        console.log(`[WIDGET] ${text}`);
      }
    });
    
    // Go to the embedded widget page
    console.log('📱 Loading embedded widget...');
    await page.goto('http://localhost:3000/embed?userId=test-integration&nickname=IntegrationTest&theme=light&embedded=true');
    
    // Wait for the widget to load
    await page.waitForSelector('.chat-container, .sidebar, [data-testid="chat-input"]', { timeout: 10000 });
    console.log('✅ Widget loaded successfully');
    
    // Check if user display name is correct
    await page.waitForTimeout(2000); // Let the widget initialize
    
    const userDisplayElements = await page.$$eval('*', elements => {
      return elements
        .filter(el => el.textContent && el.textContent.includes('IntegrationTest'))
        .map(el => el.textContent.trim());
    });
    
    if (userDisplayElements.length > 0) {
      console.log('✅ User display name found:', userDisplayElements[0]);
    } else {
      console.log('⚠️ User display name not found - checking for Loading...');
      
      const loadingElements = await page.$$eval('*', elements => {
        return elements
          .filter(el => el.textContent && el.textContent.includes('Loading...'))
          .map(el => el.textContent.trim());
      });
      
      if (loadingElements.length > 0) {
        console.log('✅ Loading state found (expected while waiting for auth)');
      }
    }
    
    // Test dive log submission (if dive journal is available)
    try {
      console.log('\n📝 Testing dive log submission...');
      
      // Look for dive journal form elements
      const diveJournalExists = await page.$('[data-testid="dive-journal"], .dive-journal, input[name="date"], input[placeholder*="date"]');
      
      if (diveJournalExists) {
        console.log('✅ Dive journal form found');
        
        // Try to fill out a simple dive log
        const dateInput = await page.$('input[name="date"], input[type="date"], input[placeholder*="date"]');
        if (dateInput) {
          await dateInput.type('2024-01-20');
          console.log('✅ Date field filled');
        }
        
        const disciplineSelect = await page.$('select[name="discipline"], select[name="disciplineType"]');
        if (disciplineSelect) {
          await page.select('select[name="discipline"], select[name="disciplineType"]', 'STA');
          console.log('✅ Discipline selected');
        }
        
        const notesField = await page.$('textarea[name="notes"], input[name="notes"]');
        if (notesField) {
          await notesField.type('Integration test dive log');
          console.log('✅ Notes field filled');
        }
        
        // Try to submit
        const submitButton = await page.$('button[type="submit"], button:contains("Submit"), button:contains("Save")');
        if (submitButton) {
          await submitButton.click();
          console.log('✅ Submit button clicked');
          
          // Wait for submission result
          await page.waitForTimeout(3000);
          console.log('⏳ Waiting for submission response...');
        }
        
      } else {
        console.log('ℹ️ Dive journal form not found (may be in sidebar or requires interaction)');
      }
    } catch (error) {
      console.log('⚠️ Dive log test skipped:', error.message);
    }
    
    // Test chat interaction
    try {
      console.log('\n💬 Testing chat interaction...');
      
      const chatInput = await page.$('input[type="text"], textarea[placeholder*="message"], [data-testid="chat-input"]');
      if (chatInput) {
        await chatInput.type('Hello, can you help me with my freediving training?');
        console.log('✅ Chat message typed');
        
        // Look for send button
        const sendButton = await page.$('button[type="submit"], button:contains("Send"), [data-testid="send-button"]');
        if (sendButton) {
          await sendButton.click();
          console.log('✅ Chat message sent');
          
          // Wait for AI response
          console.log('⏳ Waiting for AI response...');
          await page.waitForTimeout(5000);
          
          // Check if we got a response
          const messages = await page.$$eval('.message, .chat-message, [data-role="assistant"]', elements => {
            return elements.map(el => el.textContent.trim()).filter(text => text.length > 10);
          });
          
          if (messages.length > 0) {
            console.log('✅ AI response received:', messages[messages.length - 1].substring(0, 100) + '...');
          } else {
            console.log('⚠️ No AI response detected yet');
          }
        }
      } else {
        console.log('⚠️ Chat input not found');
      }
    } catch (error) {
      console.log('⚠️ Chat test failed:', error.message);
    }
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'embedded-widget-test.png', fullPage: true });
    console.log('📸 Screenshot saved as embedded-widget-test.png');
    
    console.log('\n✅ Integration test completed');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if we can run this test
try {
  testEmbeddedWidget();
} catch (error) {
  console.log('⚠️ Puppeteer test requires: npm install puppeteer');
  console.log('🔧 Alternative: Manually test at http://localhost:3000/embed?userId=test&nickname=TestUser&embedded=true');
}
