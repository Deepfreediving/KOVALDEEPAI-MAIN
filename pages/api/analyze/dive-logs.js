// ===== 📄 pages/api/dive-logs.js =====
// API endpoint to retrieve local dive logs from JSON files

import fs from 'fs';
import path from 'path';
import handleCors from '@/utils/handleCors';

export default async function handler(req, res) {
    // ✅ Handle CORS
    if (handleCors(req, res)) return;
    
    try {
        console.log('📊 Loading local dive logs...');
        
        const { userId } = req.query;
        const diveLogsDir = path.join(process.cwd(), 'data', 'diveLogs');
        
        // Check if dive logs directory exists
        if (!fs.existsSync(diveLogsDir)) {
            console.log('⚠️ Dive logs directory not found');
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No local dive logs directory found'
            });
        }
        
        const allDiveLogs = [];
        
        // Read all JSON files in the dive logs directory
        const files = fs.readdirSync(diveLogsDir);
        
        for (const file of files) {
            const filePath = path.join(diveLogsDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isFile() && file.endsWith('.json')) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const diveLog = JSON.parse(content);
                    
                    // Add file-based metadata
                    diveLog.source = 'local-file';
                    diveLog.filePath = file;
                    diveLog.lastModified = stat.mtime.toISOString();
                    
                    allDiveLogs.push(diveLog);
                } catch (parseError) {
                    console.warn(`⚠️ Could not parse dive log file ${file}:`, parseError.message);
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
        
        // Sort by date (newest first)
        allDiveLogs.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.date || 0);
            const dateB = new Date(b.timestamp || b.date || 0);
            return dateB - dateA;
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
                    const logDate = new Date(log.timestamp || log.date || 0);
                    return logDate > thirtyDaysAgo;
                });
                
                console.log(`🔄 Found ${userLogs.length} recent logs as potential user logs`);
            }
            
            // Method 4: If still no matches and we have logs, return empty for security
            if (userLogs.length === 0 && allDiveLogs.length > 0) {
                console.log(`⚠️ No logs found for userId ${userId}, returning empty for security`);
                filteredLogs = [];
            } else {
                filteredLogs = userLogs;
                console.log(`✅ Found ${filteredLogs.length} logs for userId ${userId}`);
            }
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
                source: filteredLogs[0].source
            });
            
            // Check if any logs have userId field
            const logsWithUserId = filteredLogs.filter(log => log.userId).length;
            console.log(`📊 Logs with userId field: ${logsWithUserId}/${filteredLogs.length}`);
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
                hasRecentLogs: filteredLogs.length > 0
            }
        });
        
    } catch (error) {
        console.error('❌ Error loading local dive logs:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to load local dive logs',
            details: error.message
        });
    }
}
