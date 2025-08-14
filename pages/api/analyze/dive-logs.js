// ===== 📄 pages/api/analyze/dive-logs.js =====
// ENHANCED API endpoint to retrieve dive logs from multiple sources
// 
// PRIORITY ORDER:
// 1. DiveLogs Collection (via bridge) - highest priority, most up-to-date
// 2. User-specific file logs - high priority, user-specific data
// 3. General/example file logs - lower priority, fallback data
// 
// This endpoint serves as a comprehensive fallback that can load logs from:
// - Wix DiveLogs collection (primary)
// - User-specific JSON files (backup)
// - General example files (demonstration data)
//
// Version: 5.0 - Fixed DiveLogs collection field mapping and save issues

import fs from 'fs';
import path from 'path';
import handleCors from '@/utils/handleCors';

export default async function handler(req, res) {
    // ✅ Handle CORS
    if (handleCors(req, res)) return;
    
    try {
        console.log('📊 Loading dive logs...');
        
        const { userId } = req.query;
        const allDiveLogs = [];
        
        // ✅ PRIORITY 1: Load user-specific dive logs if userId provided
        if (userId) {
            console.log(`🔍 Loading logs for user: ${userId}`);
            
            // Check serverless vs local environment
            const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
            const baseDir = isServerless ? '/tmp/diveLogs' : path.join(process.cwd(), 'data', 'diveLogs');
            const userDir = path.join(baseDir, path.basename(userId));
            
            if (fs.existsSync(userDir)) {
                console.log(`✅ Found user directory: ${userDir}`);
                const userFiles = fs.readdirSync(userDir);
                
                for (const file of userFiles) {
                    if (file.endsWith('.json')) {
                        try {
                            const filePath = path.join(userDir, file);
                            const content = fs.readFileSync(filePath, 'utf8');
                            const diveLog = JSON.parse(content);
                            
                            // Add metadata
                            diveLog.source = 'user-specific';
                            diveLog.filePath = file;
                            diveLog.priority = 'high'; // User-specific logs have priority
                            diveLog.lastModified = fs.statSync(filePath).mtime.toISOString();
                            
                            allDiveLogs.push(diveLog);
                            console.log(`✅ Loaded user log: ${file}`);
                        } catch (parseError) {
                            console.warn(`⚠️ Could not parse user log ${file}:`, parseError.message);
                        }
                    }
                }
            } else {
                console.log(`ℹ️ No user-specific directory found for: ${userId}`);
            }
        }
        
        // ✅ PRIORITY 2: Load general/example dive logs from data directory
        const generalLogsDir = path.join(process.cwd(), 'data', 'diveLogs');
        if (fs.existsSync(generalLogsDir)) {
            console.log('📂 Loading general dive logs...');
            const files = fs.readdirSync(generalLogsDir);
            
            for (const file of files) {
                const filePath = path.join(generalLogsDir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isFile() && file.endsWith('.json')) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const diveLog = JSON.parse(content);
                        
                        // Add file-based metadata
                        diveLog.source = 'general-examples';
                        diveLog.filePath = file;
                        diveLog.priority = 'low'; // Examples have lower priority
                        diveLog.lastModified = stat.mtime.toISOString();
                        
                        allDiveLogs.push(diveLog);
                    } catch (parseError) {
                        console.warn(`⚠️ Could not parse general log ${file}:`, parseError.message);
                    }
                } else if (stat.isDirectory()) {
                    // Check subdirectories (like test-user-xxx folders)
                    try {
                        const subFiles = fs.readdirSync(filePath);
                        for (const subFile of subFiles) {
                            if (subFile.endsWith('.json')) {
                                const subFilePath = path.join(filePath, subFile);
                                try {
                                    const content = fs.readFileSync(subFilePath, 'utf8');
                                    const diveLog = JSON.parse(content);
                                    
                                    diveLog.source = 'local-file-subdir';
                                    diveLog.filePath = `${file}/${subFile}`;
                                    diveLog.priority = 'medium';
                                    diveLog.lastModified = fs.statSync(subFilePath).mtime.toISOString();
                                    
                                    allDiveLogs.push(diveLog);
                                } catch (parseError) {
                                    console.warn(`⚠️ Could not parse dive log file ${file}/${subFile}:`, parseError.message);
                                }
                            }
                        }
                    } catch (subDirError) {
                        console.warn(`⚠️ Could not read subdirectory ${file}:`, subDirError.message);
                    }
                }
            }
        }
        
        // ✅ PRIORITY 3: Load from DiveLogs collection via bridge (if available)
        if (userId) {
            try {
                console.log('📊 Trying to load dive logs from DiveLogs collection...');
                
                // Try internal bridge API call (this works in serverless and local)
                const baseUrl = process.env.VERCEL_URL 
                    ? `https://${process.env.VERCEL_URL}`
                    : process.env.NODE_ENV === 'production'
                        ? 'https://koval-deep-ai.vercel.app'
                        : 'http://localhost:3000';
                        
                const bridgeUrl = `${baseUrl}/api/wix/dive-logs-bridge`;
                
                const bridgeResponse = await fetch(bridgeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        limit: 100,
                        includeAnalysis: true
                    })
                });
                
                if (bridgeResponse.ok) {
                    const bridgeData = await bridgeResponse.json();
                    if (bridgeData.success && bridgeData.diveLogs?.length > 0) {
                        bridgeData.diveLogs.forEach(log => {
                            log.source = 'divelogs-collection';
                            log.priority = 'highest'; // DiveLogs collection has highest priority
                            allDiveLogs.push(log);
                        });
                        console.log(`✅ Loaded ${bridgeData.diveLogs.length} logs from DiveLogs collection`);
                    }
                }
            } catch (bridgeError) {
                console.log('ℹ️ DiveLogs collection not available, using file fallback:', bridgeError.message);
            }
        }
        
        // Sort by priority and date (highest priority + newest first)
        allDiveLogs.sort((a, b) => {
            // First sort by priority
            const priorityOrder = { 
                'divelogs-collection': 5,  // DiveLogs collection has highest priority
                'highest': 4, 
                'high': 3, 
                'medium': 2, 
                'low': 1 
            };
            const priorityA = priorityOrder[a.source] || priorityOrder[a.priority] || 1;
            const priorityB = priorityOrder[b.source] || priorityOrder[b.priority] || 1;
            
            if (priorityA !== priorityB) {
                return priorityB - priorityA; // Higher priority first
            }
            
            // Then sort by date
            const dateA = new Date(a.timestamp || a.date || a.lastModified || 0);
            const dateB = new Date(b.timestamp || b.date || b.lastModified || 0);
            return dateB - dateA; // Newer first
        });
        
        // ✅ SMART USER FILTERING: Filter by userId with intelligent matching
        let filteredLogs = allDiveLogs;
        if (userId && userId !== 'undefined' && !userId.startsWith('guest-')) {
            console.log(`🔍 Filtering logs for userId: ${userId}`);
            
            // Method 1: Direct userId match (for logs that have userId field)
            let userLogs = allDiveLogs.filter(log => log.userId === userId);
            
            // Method 2: If no direct matches, try to match by patterns
            if (userLogs.length === 0) {
                console.log(`🔄 No direct userId matches, trying pattern matching...`);
                
                // Check if any files/directories contain the userId
                userLogs = allDiveLogs.filter(log => {
                    return log.filePath && (
                        log.filePath.includes(userId) ||
                        log.id?.includes(userId)
                    );
                });
            }
            
            // Method 3: For UUID-based userIds, try to find logs by creation patterns
            if (userLogs.length === 0 && userId.match(/^[a-f0-9-]{36}$/)) {
                console.log(`🔄 UUID userId detected, checking for recent logs...`);
                
                // For UUID users, only return logs that explicitly match their userId
                // Do NOT return all recent logs as this could be a security issue
                userLogs = allDiveLogs.filter(log => 
                    log.userId === userId ||
                    (log.filePath && log.filePath.includes(userId))
                );
                
                console.log(`🔄 Found ${userLogs.length} UUID-matched logs for user`);
            }
            
            // Method 4: STRICT Security check - filter out test data and other users' data
            userLogs = userLogs.filter(log => {
                // CRITICAL: For UUID users, ONLY return logs that exactly match their userId
                if (userId.match(/^[a-f0-9-]{36}$/)) {
                    // For UUID users, must have exact userId match
                    if (log.userId !== userId) {
                        console.log(`🚫 SECURITY: UUID user ${userId} - filtering out log with different userId: ${log.userId || 'undefined'}`);
                        return false;
                    }
                }
                
                // Exclude test users and guest users  
                if (log.userId && (
                    log.userId.startsWith('test-user-') ||
                    log.userId.startsWith('guest-') ||
                    log.userId.includes('test')
                )) {
                    console.log(`🚫 Filtering out test/guest log: ${log.id} (userId: ${log.userId})`);
                    return false;
                }
                
                // Exclude logs from test directories or with test IDs
                if (log.filePath && (
                    log.filePath.includes('test-user-') ||
                    log.filePath.includes('/test/') ||
                    log.id?.includes('test-user-')
                )) {
                    console.log(`🚫 Filtering out test directory log: ${log.filePath} (id: ${log.id})`);
                    return false;
                }
                
                // Exclude logs with test-user IDs
                if (log.id && log.id.includes('test-user-')) {
                    console.log(`🚫 Filtering out log with test-user ID: ${log.id}`);
                    return false;
                }
                
                return true;
            });
            
            filteredLogs = userLogs;
            console.log(`✅ Found ${filteredLogs.length} verified logs for userId ${userId}`);
        } else {
            console.log(`⚠️ No valid userId provided (${userId}), returning empty for security`);
            filteredLogs = [];
        }
        
        console.log(`✅ Loaded ${filteredLogs.length} dive logs for user ${userId || 'unknown'}`);
        
        // ✅ Enhanced logging for debugging
        if (filteredLogs.length > 0) {
            console.log('📊 Sample dive log:', {
                id: filteredLogs[0].id,
                date: filteredLogs[0].date,
                discipline: filteredLogs[0].discipline,
                depth: `${filteredLogs[0].reachedDepth}m (target: ${filteredLogs[0].targetDepth}m)`,
                location: filteredLogs[0].location,
                hasUserId: !!filteredLogs[0].userId,
                source: filteredLogs[0].source,
                priority: filteredLogs[0].priority
            });
            
            // Check if any logs have userId field
            const logsWithUserId = filteredLogs.filter(log => log.userId).length;
            console.log(`📊 Logs with userId field: ${logsWithUserId}/${filteredLogs.length}`);
            
            // Show source breakdown
            const sourceBreakdown = {};
            filteredLogs.forEach(log => {
                sourceBreakdown[log.source] = (sourceBreakdown[log.source] || 0) + 1;
            });
            console.log(`📊 Source breakdown:`, sourceBreakdown);
        } else {
            console.log(`⚠️ No dive logs found for user ${userId}`);
        }
        
        // ✅ Enhanced response format
        return res.status(200).json({
            success: true,
            data: filteredLogs,
            count: filteredLogs.length,
            userId: userId,
            totalLogsFound: allDiveLogs.length,
            message: filteredLogs.length > 0 
                ? `Successfully loaded ${filteredLogs.length} dive logs for user`
                : `No dive logs found for user ${userId}`,
            debug: {
                requestedUserId: userId,
                allLogsCount: allDiveLogs.length,
                filteredCount: filteredLogs.length,
                hasRecentLogs: filteredLogs.length > 0,
                sources: filteredLogs.reduce((acc, log) => {
                    acc[log.source] = (acc[log.source] || 0) + 1;
                    return acc;
                }, {})
            }
        });
        
    } catch (error) {
        console.error('❌ Error loading dive logs:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to load dive logs',
            details: error.message
        });
    }
}