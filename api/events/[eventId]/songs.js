// Vercel Serverless Function for Adding Songs to Events
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
    const { eventId } = req.query;
    const { title, artist, djName, deviceId } = req.body;

    // Validation
    if (!eventId || !title || !artist || !deviceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get existing event data
    const eventData = await kv.get(`event:${eventId}`);
    
    if (!eventData) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event has expired
    const expiresAt = new Date(eventData.event.expires_at);
    if (expiresAt < new Date()) {
      // Clean up expired event
      await kv.del(`event:${eventId}`);
      return res.status(404).json({ error: 'Event has expired' });
    }

    // Verify device ID matches (basic authentication)
    if (eventData.event.device_id !== deviceId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create new song entry
    const newSong = {
      title: title,
      artist: artist,
      dj_name: djName || "",
      timestamp: new Date().toISOString()
    };

    // Add song to event
    eventData.songs.push(newSong);

    // Update event in Vercel KV
    await kv.set(`event:${eventId}`, eventData);

    res.status(201).json({
      success: true,
      song: newSong,
      totalSongs: eventData.songs.length
    });

  } catch (error) {
    console.error('Song addition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}