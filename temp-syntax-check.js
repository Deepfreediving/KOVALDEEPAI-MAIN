// ===== 📄 http-getUserProfile.jsw =====
// This function fetches user profile data from Wix Collections/Members

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixUsers from 'wix-users-backend';
import wixData from 'wix-data';

/**
 * OPTIONS: Handle preflight requests
 */
export function options_getUserProfile(request) {
    return {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    };
}

/**
 * GET: Fetch user profile data
 */
export async function get_getUserProfile(request) {
    try {
        console.log('🔍 Getting user profile from Collections/Members...');
        
        // Get current user ID
        const currentUser = wixUsers.currentUser;
        if (!currentUser || !currentUser.loggedIn) {
            console.log('❌ No authenticated user found');
            return ok({
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    isGuest: true,
                    user: {
                        userId: 'guest-' + Date.now(),
                        displayName: 'Guest User',
                        email: '',
                        firstName: '',
                        lastName: '',
                        profilePicture: '',
                        source: 'guest'
                    }
                })
            });
        }

        const userId = currentUser.id;
        console.log('👤 Current user ID:', userId);

        // Try to get user profile from Members collection
        let memberProfile = null;
        try {
            const memberQuery = await wixData.query('Members')
                .eq('_id', userId)
                .find();
                
            if (memberQuery.items && memberQuery.items.length > 0) {
                memberProfile = memberQuery.items[0];
                console.log('✅ Found member profile in collection:', memberProfile);
            } else {
                console.log('⚠️ No member profile found in Members collection');
            }
        } catch (collectionError) {
            console.log('⚠️ Members collection not accessible or doesn\'t exist:', collectionError.message);
        }

        // Get basic user data from Wix Users API as fallback
        const userProfile = {
            userId: userId,
            displayName: currentUser.displayName || 'User',
            email: currentUser.loginEmail || '',
            firstName: '',
            lastName: '',
            profilePicture: '',
            source: 'wix-users-api'
        };

        // If we found member profile, merge the data
        if (memberProfile) {
            userProfile.displayName = memberProfile.displayName || 
                                    memberProfile.firstName + ' ' + memberProfile.lastName ||
                                    memberProfile.name ||
                                    userProfile.displayName;
                                    
            userProfile.firstName = memberProfile.firstName || '';
            userProfile.lastName = memberProfile.lastName || '';
            userProfile.email = memberProfile.email || userProfile.email;
            userProfile.profilePicture = memberProfile.profilePicture?.url || 
                                       memberProfile.picture?.url || 
                                       memberProfile.avatar?.url || '';
            userProfile.phone = memberProfile.phone || '';
            userProfile.bio = memberProfile.bio || memberProfile.description || '';
            userProfile.location = memberProfile.location || memberProfile.city || '';
            userProfile.source = 'members-collection';
            
            // Add any custom fields that might exist
            if (memberProfile.customFields) {
                userProfile.customFields = memberProfile.customFields;
            }
        }

        console.log('✅ Final user profile:', userProfile);

        return ok({
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                isGuest: false,
                user: userProfile
            })
        });

    } catch (error) {
        console.error('❌ Error getting user profile:', error);
        
        return serverError({
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message,
                user: {
                    userId: 'error-' + Date.now(),
                    displayName: 'Error User',
                    email: '',
                    source: 'error'
                }
            })
        });
    }
}

export async function post_getUserProfile(request) {
    // Handle POST requests the same way
    return get_getUserProfile(request);
}
