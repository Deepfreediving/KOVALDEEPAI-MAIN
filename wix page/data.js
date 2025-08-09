// ===== 📄 data.js - Wix Data Hooks =====
// This file should be uploaded to your Wix backend data folder

import { currentMember } from 'wix-members';

/**
 * ✅ Collection: PrivateMembersData
 * This hooks into queries for a private members data collection
 */

export function PrivateMembersData_beforeQuery(query, context) {
    console.log('🔍 PrivateMembersData beforeQuery called');
    return query;
}

export function PrivateMembersData_afterQuery(results, context) {
    return currentMember.getCurrentMember()
        .then((member) => {
            if (member && results.items) {
                results.items.forEach(item => {
                    item.currentMemberId = member._id;
                    item.currentMemberEmail = member.loginEmail;
                    item.firstName = member.contactDetails?.firstName || '';
                    item.lastName = member.contactDetails?.lastName || '';
                    item.nickname = member.profile?.nickname || '';
                });
                console.log('✅ PrivateMembersData afterQuery - Added member context to', results.items.length, 'items');
            }
            return results;
        })
        .catch((error) => {
            console.warn('⚠️ PrivateMembersData afterQuery error:', error);
            return results;
        });
}

export function PrivateMembersData_beforeGet(itemId, context) {
    console.log('🔍 PrivateMembersData beforeGet called for:', itemId);
}

export function PrivateMembersData_afterGet(item, context) {
    if (!item) return item;
    
    return currentMember.getCurrentMember()
        .then((member) => {
            if (member) {
                item.currentMemberId = member._id;
                item.currentMemberEmail = member.loginEmail;
                item.firstName = member.contactDetails?.firstName || '';
                item.lastName = member.contactDetails?.lastName || '';
                item.nickname = member.profile?.nickname || '';
                console.log('✅ PrivateMembersData afterGet - Added member context');
            }
            return item;
        })
        .catch((error) => {
            console.warn('⚠️ PrivateMembersData afterGet error:', error);
            return item;
        });
}

/**
 * ✅ Collection: Members (Built-in Wix Members collection)
 * Add hooks to enhance member data if needed
 */

export function Members_afterQuery(results, context) {
    if (results.items) {
        console.log('✅ Members afterQuery - Processing', results.items.length, 'members');
    }
    return results;
}

export function Members_afterGet(item, context) {
    if (item) {
        console.log('✅ Members afterGet - Processing member:', item._id);
    }
    return item;
}

/**
 * ✅ Error handler for any data hooks failures
 */
export function PrivateMembersData_onFailure(error, context) {
    console.error('❌ PrivateMembersData hook failure:', error);
}

export function Members_onFailure(error, context) {
    console.error('❌ Members hook failure:', error);
}
