// Simplified GitHub login handler for Vercel
export default function handler(req, res) {
  try {
    // Get GitHub OAuth URL parameters
    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;
    
    if (!githubClientId || !redirectUri) {
      console.error('Missing GitHub OAuth configuration');
      return res.status(500).json({ error: 'GitHub OAuth configuration is incomplete' });
    }
    
    // Requesting necessary scopes
    const scopes = ['user:email', 'read:user', 'repo', 'read:org'].join(' ');
    
    // Create the GitHub authorization URL
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=${scopes}&prompt=consent`;
    
    // Check if this is a browser request
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    
    if (acceptsHtml) {
      // Redirect browser requests
      return res.redirect(githubAuthUrl);
    }
    
    // Return JSON for API requests
    return res.status(200).json({ url: githubAuthUrl });
  } catch (error) {
    console.error('GitHub login error:', error);
    return res.status(500).json({ error: 'Failed to create GitHub login URL' });
  }
}