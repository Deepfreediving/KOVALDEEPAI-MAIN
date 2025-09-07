// Debug endpoint to check user data
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { currentUser, userProfile } = req.body;
  
  console.log('🔍 Debug user data:');
  console.log('  currentUser:', JSON.stringify(currentUser, null, 2));
  console.log('  userProfile:', JSON.stringify(userProfile, null, 2));
  
  return res.status(200).json({
    currentUser,
    userProfile,
    userIdFrom: {
      currentUserId: currentUser?.id,
      profileUserId: userProfile?.userId,
      currentUserKeys: currentUser ? Object.keys(currentUser) : [],
      profileKeys: userProfile ? Object.keys(userProfile) : []
    }
  });
}
