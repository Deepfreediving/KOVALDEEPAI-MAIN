// EMERGENCY BYPASS - STOP GLITCHING IMMEDIATELY
export default async function handler(req, res) {
  // Return success immediately to stop the ERR_INSUFFICIENT_RESOURCES
  return res.status(200).json({ 
    diveLogs: [], // Empty array - app will use localStorage
    success: true,
    emergency: true,
    message: "Emergency mode active - using localStorage only",
    timestamp: new Date().toISOString()
  });
}
