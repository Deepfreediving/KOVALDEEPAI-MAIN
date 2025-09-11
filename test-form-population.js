#!/usr/bin/env node

// Test dive log editing form population
const puppeteer = require('puppeteer');

async function testDiveLogEditing() {
  console.log('🧪 Testing dive log editing form population...');
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Set to true for headless testing
    devtools: true
  });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(2000);
    
    console.log('📱 Opened app, looking for dive journal...');
    
    // Look for dive journal button or embedded component
    const diveJournalButton = await page.$('button:has-text("🗒️ Dive Journal")');
    if (diveJournalButton) {
      console.log('🗒️ Found dive journal button, clicking...');
      await diveJournalButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Check if there are any saved logs to edit
    const editButton = await page.$('button:has-text("✏️ Edit")');
    if (editButton) {
      console.log('✏️ Found edit button, clicking to test form population...');
      await editButton.click();
      await page.waitForTimeout(2000);
      
      // Check if the form is populated
      const mouthfillDepthInput = await page.$('input[name="mouthfillDepth"]');
      if (mouthfillDepthInput) {
        const value = await page.evaluate(el => el.value, mouthfillDepthInput);
        console.log(`📊 Mouthfill depth field value: "${value}"`);
        
        if (value && value !== '') {
          console.log('✅ SUCCESS: Form field is populated with existing data!');
        } else {
          console.log('⚠️ WARNING: Mouthfill depth field is empty - may indicate population issue');
        }
      } else {
        console.log('❌ Could not find mouthfillDepth input field');
      }
      
      // Check other critical fields
      const fields = ['targetDepth', 'reachedDepth', 'location', 'notes'];
      for (const fieldName of fields) {
        const input = await page.$(`input[name="${fieldName}"], textarea[name="${fieldName}"]`);
        if (input) {
          const value = await page.evaluate(el => el.value, input);
          console.log(`📝 ${fieldName}: "${value}"`);
        }
      }
      
    } else {
      console.log('ℹ️ No existing logs found to edit - this is expected for a fresh database');
      
      // Try creating a test log first
      console.log('➕ Creating a test dive log...');
      const addNewTab = await page.$('button:has-text("✍️")');
      if (addNewTab) {
        await addNewTab.click();
        await page.waitForTimeout(1000);
        
        // Fill in test data
        await page.fill('input[name="targetDepth"]', '25');
        await page.fill('input[name="reachedDepth"]', '23');
        await page.fill('input[name="mouthfillDepth"]', '15');
        await page.fill('input[name="location"]', 'Test Pool');
        await page.fill('textarea[name="notes"]', 'Test dive for form population');
        
        console.log('📝 Filled test data, submitting...');
        
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await page.waitForTimeout(3000);
          
          console.log('✅ Test log created! Now testing edit...');
          
          // Go back to saved logs and try to edit
          const savedLogsTab = await page.$('button:has-text("💾 Saved Logs")');
          if (savedLogsTab) {
            await savedLogsTab.click();
            await page.waitForTimeout(1000);
            
            const newEditButton = await page.$('button:has-text("✏️ Edit")');
            if (newEditButton) {
              await newEditButton.click();
              await page.waitForTimeout(2000);
              
              // Check form population
              const mouthfillValue = await page.evaluate(() => {
                const input = document.querySelector('input[name="mouthfillDepth"]');
                return input ? input.value : null;
              });
              
              console.log(`📊 Mouthfill depth after edit: "${mouthfillValue}"`);
              
              if (mouthfillValue === '15') {
                console.log('🎉 SUCCESS: Form population is working correctly!');
              } else {
                console.log('❌ FAILED: Form not populated correctly');
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  testDiveLogEditing().catch(console.error);
}
