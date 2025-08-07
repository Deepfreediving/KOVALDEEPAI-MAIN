// Wix Data Hooks for PrivateMembersData Collection
// This should be added to your Wix backend data hooks file

import { currentMember } from 'wix-members';

export function Members$PrivateMembersData_beforeGet(itemId, context) {
  // Log the current member context
  return currentMember.getCurrentMember()
    .then((member) => {
      if (member) {
        console.log('🔍 beforeGet - Current member:', member._id);
      }
    })
    .catch(() => {
      console.log('⚠️ beforeGet - No authenticated member');
    });
}

export function Members$PrivateMembersData_afterGet(item, context) {
  // Add current member info to the retrieved item
  return currentMember.getCurrentMember()
    .then((member) => {
      if (member && item) {
        // Add member context to the item
        item.currentMemberId = member._id;
        item.currentMemberEmail = member.loginEmail;
        console.log('✅ afterGet - Added member context:', member._id);
      }
      return item;
    })
    .catch(() => {
      console.log('⚠️ afterGet - No authenticated member');
      return item;
    });
}

export function Members$PrivateMembersData_beforeQuery(query, context) {
  // Filter query to only return data for the current member
  return currentMember.getCurrentMember()
    .then((member) => {
      if (member) {
        // Automatically filter by current member
        query = query.eq('_owner', member._id);
        console.log('🔍 beforeQuery - Filtering for member:', member._id);
      }
      return query;
    })
    .catch(() => {
      console.log('⚠️ beforeQuery - No authenticated member');
      return query;
    });
}

export function Members$PrivateMembersData_afterQuery(results, context) {
  // Add member context to all results
  return currentMember.getCurrentMember()
    .then((member) => {
      if (member && results.items) {
        results.items.forEach(item => {
          item.currentMemberId = member._id;
          item.currentMemberEmail = member.loginEmail;
        });
        console.log(`✅ afterQuery - Added member context to ${results.items.length} items for:`, member._id);
      }
      return results;
    })
    .catch(() => {
      console.log('⚠️ afterQuery - No authenticated member');
      return results;
    });
}

export function Members$PrivateMembersData_beforeCount(query, context) {
  // Filter count query to only count data for the current member
  return currentMember.getCurrentMember()
    .then((member) => {
      if (member) {
        query = query.eq('_owner', member._id);
        console.log('🔍 beforeCount - Filtering count for member:', member._id);
      }
      return query;
    })
    .catch(() => {
      console.log('⚠️ beforeCount - No authenticated member');
      return query;
    });
}

export function Members$PrivateMembersData_afterCount(count, context) {
  // Log the count result with member context
  return currentMember.getCurrentMember()
    .then((member) => {
      if (member) {
        console.log(`✅ afterCount - Count result for member ${member._id}:`, count);
      }
      return count;
    })
    .catch(() => {
      console.log('⚠️ afterCount - No authenticated member');
      return count;
    });
}

export function Members$PrivateMembersData_onFailure(error, context) {
  // Log failures with member context
  return currentMember.getCurrentMember()
    .then((member) => {
      if (member) {
        console.error(`❌ Data hook failure for member ${member._id}:`, error);
      } else {
        console.error('❌ Data hook failure (no authenticated member):', error);
      }
    })
    .catch(() => {
      console.error('❌ Data hook failure (member check failed):', error);
    });
}

// 🎯 BONUS: Helper function to get member ID that you can export
export function getCurrentMemberId() {
  return currentMember.getCurrentMember()
    .then((member) => {
      if (member) {
        console.log('🆔 Helper - Current member ID:', member._id);
        return member._id;
      }
      return null;
    })
    .catch(() => {
      console.log('⚠️ Helper - No authenticated member');
      return null;
    });
}
