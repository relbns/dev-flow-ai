import axios from 'axios';
import jwt from 'jsonwebtoken';

// GitHub callback handler for Vercel
export default async function handler(req, res) {
  // Add console.log for debugging
  console.log('GitHub callback received at:', new Date().toISOString());
  console.log('Query parameters:', req.query);
  
  try {
    const { code } = req.query;

    if (!code) {
      console.error('No code provided in callback');
      // Hardcode the GitHub Pages URL
      return res.redirect('https://relbns.github.io/dev-flow-ai/auth/callback?error=GitHub authorization code is required');
    }

    // Get GitHub OAuth credentials
    const clientId = process.env.GITHUB_CLIENT_ID || 'Ov23liGyrjPcmvI0QH2n';
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || 'faed61ad6dc1a3cb2564c99a12cd71f2f32fe459';
    const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'https://dev-flow-ai.vercel.app/api/auth/github-callback';
    
    if (!clientId || !clientSecret) {
      console.error('Missing GitHub OAuth credentials');
      return res.redirect('https://relbns.github.io/dev-flow-ai/auth/callback?error=Server configuration error');
    }
    
    console.log('Using GitHub credentials:', { clientId, callbackUrl });
    
    // Exchange code for token
    console.log('Exchanging code for token');
    let tokenData;
    try {
      const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl
      }, {
        headers: { Accept: 'application/json' },
        timeout: 5000 // 5 second timeout
      });
      
      console.log('Token response status:', tokenResponse.status);
      console.log('Token response contains error:', !!tokenResponse.data.error);
      
      if (tokenResponse.data.error) {
        throw new Error(`GitHub token error: ${tokenResponse.data.error_description || tokenResponse.data.error}`);
      }
      
      tokenData = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        expiresIn: tokenResponse.data.expires_in
      };
      
      console.log('Received access token:', tokenData.accessToken ? 'YES' : 'NO');
      
      if (!tokenData.accessToken) {
        throw new Error('No access token returned');
      }
    } catch (tokenError) {
      console.error('Token exchange error:', tokenError.message);
      if (tokenError.response) {
        console.error('Token exchange error response:', tokenError.response.data);
      }
      return res.redirect('https://relbns.github.io/dev-flow-ai/auth/callback?error=' + 
        encodeURIComponent('Failed to exchange GitHub code for token: ' + tokenError.message));
    }
    
    // Get user profile
    console.log('Fetching GitHub user profile');
    let profileData;
    try {
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${tokenData.accessToken}` },
        timeout: 5000
      });
      
      // Get user's email
      const emailResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `token ${tokenData.accessToken}` },
        timeout: 5000
      });
      
      const primaryEmail = emailResponse.data.find(email => email.primary)?.email || emailResponse.data[0]?.email;
      
      profileData = {
        githubId: userResponse.data.id.toString(),
        username: userResponse.data.login,
        displayName: userResponse.data.name,
        email: primaryEmail,
        avatarUrl: userResponse.data.avatar_url
      };
      
      console.log('User profile fetched:', profileData.username);
    } catch (profileError) {
      console.error('Profile fetch error:', profileError.message);
      if (profileError.response) {
        console.error('Profile fetch error response:', profileError.response.data);
      }
      return res.redirect('https://relbns.github.io/dev-flow-ai/auth/callback?error=' + 
        encodeURIComponent('Failed to fetch GitHub user profile: ' + profileError.message));
    }
    
    // Generate JWT with user data
    console.log('Generating JWT with GitHub data');
    const jwtSecret = process.env.JWT_SECRET || 'devflow-ai-jwt-secret-for-development';
    
    const tempToken = jwt.sign(
      { 
        githubId: profileData.githubId,
        username: profileData.username,
        displayName: profileData.displayName,
        email: profileData.email,
        avatarUrl: profileData.avatarUrl,
        // Include the GitHub token data
        githubToken: tokenData.accessToken,
        githubRefreshToken: tokenData.refreshToken,
        tokenExpiresIn: tokenData.expiresIn,
        // Mark as temp token
        isTemp: true
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
    
    // Hardcode the GitHub Pages URL
    const redirectUrl = `https://relbns.github.io/dev-flow-ai/auth/callback?token=${encodeURIComponent(tempToken)}`;
    console.log('Redirecting to:', redirectUrl);
    
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('GitHub callback error:', error.message);
    return res.redirect('https://relbns.github.io/dev-flow-ai/auth/callback?error=' + 
      encodeURIComponent(error.message || 'Server error'));
  }
}