// 🔍 WIX MEMBER AUTHENTICATION TEST
// Test what currentMember.getMember() actually returns

import { currentMember } from 'wix-members-frontend';

console.log('🔍 Testing Wix Member Authentication...');

async function testWixMemberAuth() {
  try {
    console.log('📞 Calling currentMember.getMember()...');
    const member = await currentMember.getMember();
    
    console.log('✅ Member object received:', member);
    console.log('🔍 Member properties:', Object.keys(member || {}));
    
    if (member) {
      console.log('📋 Member details:');
      console.log('   • _id:', member._id);
      console.log('   • loggedIn:', member.loggedIn);
      console.log('   • loginEmail:', member.loginEmail);
      console.log('   • profile:', member.profile);
      console.log('   • roles:', member.roles);
      console.log('   • status:', member.status);
      
      if (member.profile) {
        console.log('👤 Profile details:', Object.keys(member.profile));
        console.log('   • nickname:', member.profile.nickname);
        console.log('   • firstName:', member.profile.firstName);
        console.log('   • lastName:', member.profile.lastName);
      }
      
      if (member._id) {
        console.log('✅ SUCCESS: Found member._id =', member._id);
        console.log('💡 This should be used as userId for dive logs');
        
        // Test storage key format
        const storageKey = `diveLogs_${member._id}`;
        console.log('🔑 Correct localStorage key:', storageKey);
        
        // Return the correct user data
        return {
          userId: member._id,
          memberId: member._id,
          userEmail: member.loginEmail,
          userName: member.profile?.nickname || member.profile?.firstName || member.loginEmail,
          isAuthenticated: true,
          source: 'wix-member-api'
        };
      }
    }
    
    console.log('❌ No valid member found or not logged in');
    return null;
    
  } catch (error) {
    console.error('❌ Error testing member auth:', error);
    return null;
  }
}

// Auto-run test
testWixMemberAuth().then(result => {
  if (result) {
    console.log('🎯 FINAL RESULT: Use this user data:');
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('⚠️ Member authentication failed - user will be guest');
  }
});

export { testWixMemberAuth };
