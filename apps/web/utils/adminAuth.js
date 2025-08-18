// Simple admin authentication utility
// File: apps/web/utils/adminAuth.js

export const ADMIN_EMAIL = 'daniel@deepfreediving.com'; // Replace with your actual email
export const ADMIN_USER_ID = 'admin-daniel-koval';

export function isAdminUser(userId, email) {
  return (
    userId === ADMIN_USER_ID ||
    email === ADMIN_EMAIL ||
    email === 'danielkoval@example.com' ||
    email === 'daniel@deepfreediving.com'
  );
}

export function getAdminUserId() {
  return ADMIN_USER_ID;
}

export function setAdminSession() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('kovalUser', ADMIN_USER_ID);
    localStorage.setItem('kovalProfile', JSON.stringify({
      userId: ADMIN_USER_ID,
      firstName: 'Daniel',
      lastName: 'Koval',
      nickname: 'Daniel Koval',
      email: ADMIN_EMAIL,
      isAdmin: true,
      isInstructor: true,
      pb: 120, // Your personal best depth
      source: 'admin'
    }));
  }
}

export function clearAdminSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kovalUser');
    localStorage.removeItem('kovalProfile');
  }
}
