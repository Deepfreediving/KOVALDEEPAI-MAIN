// ===== 📄 dataset-integration.js - UserMemory Dataset Helper =====
// Add this to your Wix page code to properly integrate the UserMemory dataset

import wixData from 'wix-data';
import wixUsers from 'wix-users';

/**
 * ✅ Initialize UserMemory Dataset with proper filtering
 */
export function initializeUserMemoryDataset() {
    $w.onReady(() => {
        // ✅ Set up dataset filtering by current user
        if (wixUsers.currentUser.loggedIn) {
            const userId = wixUsers.currentUser.id;
            console.log('🔍 Filtering UserMemory dataset for user:', userId);
            
            // Filter dataset to show only current user's memories
            $w('#dataset1').setFilter(wixData.filter()
                .eq('userId', userId)
            );
            
            // ✅ Load the data
            $w('#dataset1').loadPage()
                .then(() => {
                    console.log('✅ UserMemory dataset loaded successfully');
                    console.log('📊 Loaded items:', $w('#dataset1').getTotalCount());
                })
                .catch((error) => {
                    console.error('❌ Error loading UserMemory dataset:', error);
                });
        } else {
            console.warn('⚠️ User not logged in, cannot filter UserMemory dataset');
        }
    });
}

/**
 * ✅ Save new memory to dataset
 */
export async function saveMemoryToDataset(memoryData) {
    try {
        if (!wixUsers.currentUser.loggedIn) {
            throw new Error('User not logged in');
        }
        
        const userId = wixUsers.currentUser.id;
        
        // Prepare data for saving
        const newMemory = {
            userId: userId,
            memoryContent: memoryData.content || memoryData.memoryContent,
            logEntry: memoryData.logEntry || '',
            sessionName: memoryData.sessionName || 'Page Session',
            timestamp: new Date(),
            metadata: memoryData.metadata || {}
        };
        
        // Save to dataset
        const result = await $w('#dataset1').save(newMemory);
        console.log('✅ Memory saved to dataset:', result);
        
        return { success: true, data: result };
        
    } catch (error) {
        console.error('❌ Error saving memory to dataset:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ✅ Load user memories from dataset
 */
export function getUserMemoriesFromDataset() {
    try {
        const memories = $w('#dataset1').getCurrentPageItems();
        console.log('📋 Retrieved memories from dataset:', memories.length);
        return memories;
    } catch (error) {
        console.error('❌ Error getting memories from dataset:', error);
        return [];
    }
}

/**
 * ✅ Setup dataset event handlers
 */
export function setupDatasetEventHandlers() {
    // Handle dataset ready
    $w('#dataset1').onReady(() => {
        console.log('📊 UserMemory dataset is ready');
    });
    
    // Handle dataset errors
    $w('#dataset1').onError((error) => {
        console.error('❌ Dataset error:', error);
    });
    
    // Handle data changes
    $w('#dataset1').onCurrentItemChanged(() => {
        console.log('🔄 Dataset current item changed');
    });
}

// ✅ Initialize everything
initializeUserMemoryDataset();
setupDatasetEventHandlers();
