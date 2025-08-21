// Vercel Serverless Function for Getting Event Data
const { kv } = require("@vercel/kv");

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Get event data from Vercel KV
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

    res.status(200).json(eventData);

  } catch (error) {
    console.error('Event fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}