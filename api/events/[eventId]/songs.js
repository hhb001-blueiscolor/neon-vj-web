// Vercel Serverless Function for Adding Songs to Events
const { Octokit } = require("@octokit/rest");

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
    const { title, artist, djName, shazamId } = req.body;

    // Validation
    if (!eventId || !title || !artist || !djName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Initialize Octokit
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Get existing file
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: 'hhb001-blueiscolor',
      repo: 'neon-vj-web',
      path: `public/data/events/${eventId}.json`,
    });

    // Parse existing content
    const existingContent = Buffer.from(fileData.content, 'base64').toString();
    const eventData = JSON.parse(existingContent);

    // Add new song
    const newSong = {
      id: generateSongId(),
      title: title,
      artist: artist,
      dj_name: djName,
      timestamp: new Date().toISOString(),
      shazam_id: shazamId || ""
    };

    eventData.songs.push(newSong);

    // Update file
    const newContent = Buffer.from(JSON.stringify(eventData, null, 2)).toString('base64');
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: 'hhb001-blueiscolor',
      repo: 'neon-vj-web',
      path: `public/data/events/${eventId}.json`,
      message: `Add song: ${title} by ${artist}`,
      content: newContent,
      sha: fileData.sha,
    });

    res.status(200).json({
      success: true,
      message: 'Song added successfully'
    });

  } catch (error) {
    console.error('Song addition error:', error);
    
    if (error.status === 404) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateSongId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}