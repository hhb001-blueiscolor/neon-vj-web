// Vercel Serverless Function for Event Creation
const { kv } = require("@vercel/kv");

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventName, eventURL, djDisplayMode, deviceId } = req.body;

    // Validation
    if (!eventName || !deviceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate event ID
    const eventId = generateEventId();
    
    // Create event data
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const eventData = {
      event: {
        id: eventId,
        name: eventName,
        event_url: eventURL || "",
        dj_display_mode: djDisplayMode || "chronological",
        device_id: deviceId,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      },
      songs: []
    };

    // Store in Vercel KV (no GitHub username exposure)
    await kv.set(`event:${eventId}`, eventData);

    res.status(201).json({
      success: true,
      eventId: eventId,
      eventURL: `https://web.neondjneon.com/live.html?event=${eventId}`
    });

  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateEventId() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = 8;
  return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}