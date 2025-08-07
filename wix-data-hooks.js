// SIMPLIFIED Wix Data Hooks for PrivateMembersData
// Copy this into your Wix data.js file

import { currentMember } from 'wix-members';

export function Members$PrivateMembersData_beforeGet(itemId, context) {
  // Simple version - just log
  console.log('🔍 beforeGet called');
}

export function Members$PrivateMembersData_afterGet(item, context) {
  // Add current member info to the retrieved item
  if (!item) return item;
  
  return currentMember.getCurrentMember()
    .then((member) => {
      if (member) {
        item.currentMemberId = member._id;
        item.currentMemberEmail = member.loginEmail;
        console.log('✅ afterGet - Added member ID:', member._id);
      }
      return item;
    })
    .catch((error) => {
      console.log('⚠️ afterGet - Error:', error);
      return item;
    });
}

export function Members$PrivateMembersData_beforeQuery(query, context) {
  // Simple version - just log
  console.log('🔍 beforeQuery called');
  return query;
}

export function Members$PrivateMembersData_afterQuery(results, context) {
  // Add member context to all results
  if (!results || !results.items) return results;
  
  return currentMember.getCurrentMember()
    .then((member) => {
      if (member) {
        results.items.forEach(item => {
          item.currentMemberId = member._id;
          item.currentMemberEmail = member.loginEmail;
        });
        console.log('✅ afterQuery - Added member ID to', results.items.length, 'items:', member._id);
      }
      return results;
    })
    .catch((error) => {
      console.log('⚠️ afterQuery - Error:', error);
      return results;
    });
}

export function Members$PrivateMembersData_beforeCount(query, context) {
  console.log('🔍 beforeCount called');
  return query;
}

export function Members$PrivateMembersData_afterCount(count, context) {
  console.log('✅ afterCount result:', count);
  return count;
}

export function Members$PrivateMembersData_onFailure(error, context) {
  console.error('❌ Data hook failure:', error);
}
