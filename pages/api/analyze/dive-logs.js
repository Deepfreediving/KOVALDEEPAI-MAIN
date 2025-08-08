// ===== 📄 pages/api/analyze/dive-logs-2.js =====
// FIXED API endpoint to retrieve dive logs from multiple sources

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
        
        // ✅ PRIORITY 3: Load from memory/database if available
        try {
            // Import the memory manager (this might not exist in all setups)
            const { getUserDiveLogs } = await import('@/lib/userMemoryManager');
            
            if (userId && getUserDiveLogs) {
                console.log('📊 Loading dive logs from memory system...');
                const memoryLogs = await getUserDiveLogs(userId);
                
                if (memoryLogs && memoryLogs.length > 0) {
                    memoryLogs.forEach(log => {
                        log.source = 'memory-system';
                        log.priority = 'highest'; // Memory logs are most recent/relevant
                        allDiveLogs.push(log);
                    });
                    console.log(`✅ Loaded ${memoryLogs.length} logs from memory system`);
                }
            }
        } catch (memoryError) {
            console.log('ℹ️ Memory system not available or no logs found:', memoryError.message);
        }
        
        // Sort by priority and date (highest priority + newest first)
        allDiveLogs.sort((a, b) => {
            // First sort by priority
            const priorityOrder = { 'highest': 4, 'high': 3, 'medium': 2, 'low': 1 };
            const priorityA = priorityOrder[a.priority] || 1;
            const priorityB = priorityOrder[b.priority] || 1;
            
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
                
                // For now, return logs from the last 30 days as potential user logs
                // This is a fallback until proper userId tracking is implemented
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                userLogs = allDiveLogs.filter(log => {
                    const logDate = new Date(log.timestamp || log.date || log.lastModified || 0);
                    return logDate > thirtyDaysAgo;
                });
                
                console.log(`🔄 Found ${userLogs.length} recent logs as potential user logs`);
            }
            
            // Method 4: If still no matches, return user-specific and high-priority logs only
            if (userLogs.length === 0 && allDiveLogs.length > 0) {
                console.log(`⚠️ No direct matches for userId ${userId}, returning high-priority logs only`);
                userLogs = allDiveLogs.filter(log => 
                    log.source === 'user-specific' || 
                    log.source === 'memory-system' ||
                    log.priority === 'highest'
                );
            }
            
            filteredLogs = userLogs;
            console.log(`✅ Found ${filteredLogs.length} logs for userId ${userId}`);
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
