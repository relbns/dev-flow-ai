# DevFlow AI - Deployment Guide

This guide explains how to deploy the DevFlow AI application:

- Server (Backend) → Deploy to Vercel
- Web Client (Frontend) → Deploy to GitHub Pages

## Prerequisites

Before starting the deployment process, you'll need:

1. A [GitHub](https://github.com) account
2. A [Vercel](https://vercel.com) account (connected to your GitHub account)
3. A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account for database
4. [GitHub OAuth App](https://github.com/settings/developers) for authentication

## Step 1: Set Up GitHub Repository

1. Push your code to a GitHub repository
2. Ensure the repository is public if you want to use the free GitHub Pages

## Step 2: Deploy Server to Vercel

1. **Connect Vercel to your GitHub repository**:
   - Log in to Vercel and click "Add New..." → "Project"
   - Select your GitHub repository
   - Configure project settings:
     - Root Directory: `apps/server`
     - Build Command: `npm run build`
     - Output Directory: `public`
     - Install Command: `npm install`

2. **Set Up Environment Variables in Vercel**:
   Add the following environment variables:
   ```
   NODE_ENV=production
   MONGODB_URI=your-mongodb-atlas-connection-string
   JWT_SECRET=your-secure-jwt-secret
   GITHUB_CLIENT_ID=your-github-oauth-app-client-id
   GITHUB_CLIENT_SECRET=your-github-oauth-app-client-secret
   GITHUB_CALLBACK_URL=https://your-vercel-app.vercel.app/api/auth/github/callback
   FRONTEND_URL=https://yourusername.github.io/dev-flow-ai
   ALLOWED_ORIGINS=https://yourusername.github.io,https://your-vercel-app.vercel.app
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=50
   API_KEY_DEFAULT_EXPIRY_DAYS=90
   LOG_LEVEL=warn
   ```

3. **Deploy the Server**:
   - Click "Deploy" in Vercel
   - Once deployed, Vercel will provide you with a URL (e.g., `https://your-app.vercel.app`)
   - Note this URL as it will be needed for the client configuration

## Step 3: Configure GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App (or update an existing one):
   - Application name: `DevFlow AI` (or your preferred name)
   - Homepage URL: `https://yourusername.github.io/dev-flow-ai`
   - Authorization callback URL: `https://your-vercel-app.vercel.app/api/auth/github/callback`
3. Copy the Client ID and Client Secret

## Step 4: Update Client Configuration for GitHub Pages

1. Open `apps/web/.env.production` and update:
   ```
   VITE_API_BASE_URL=https://your-vercel-app.vercel.app/api
   VITE_GITHUB_AUTH_URL=https://your-vercel-app.vercel.app/auth/github/login
   ```

2. Update `apiClient.js` and `githubApi.js` to use your Vercel URL:
   - Replace all instances of `https://your-vercel-app.vercel.app` with your actual Vercel app URL

## Step 5: Set Up GitHub Actions Secrets

Add the following secrets to your GitHub repository:

1. `VITE_API_BASE_URL`: Your Vercel API URL (e.g., `https://your-app.vercel.app/api`)
2. `VITE_GITHUB_AUTH_URL`: Your GitHub auth URL (e.g., `https://your-app.vercel.app/auth/github/login`)
3. `VERCEL_TOKEN`: A Vercel personal access token
4. `VERCEL_ORG_ID`: Your Vercel organization ID
5. `VERCEL_PROJECT_ID`: Your Vercel project ID

## Step 6: Deploy Client to GitHub Pages

1. The GitHub Actions workflow will automatically deploy to GitHub Pages when you push to the main branch
2. You can also manually trigger the workflow from the Actions tab in your GitHub repository
3. After deployment, your client will be available at `https://yourusername.github.io/dev-flow-ai/`

## Troubleshooting

### CORS Issues
If you encounter CORS issues:
1. Verify the `ALLOWED_ORIGINS` environment variable on the server includes your GitHub Pages URL
2. Check that the CORS middleware in the server is correctly configured
3. Ensure your API requests include the appropriate headers

### Authentication Issues
If GitHub authentication fails:
1. Verify your GitHub OAuth App settings, especially the callback URL
2. Check the `GITHUB_CALLBACK_URL` environment variable on the server
3. Ensure the client is using the correct auth endpoint URL

### Deployment Issues
If deployment fails:
1. Check GitHub Actions logs for errors
2. Verify all required secrets are correctly set
3. Ensure your Vercel configuration is correct

## Local Development After Deployment

For local development after deployment:
1. Use the `.env` files (not `.env.production`) for local development settings
2. Run `npm run dev` in the root directory to start both server and client locally
