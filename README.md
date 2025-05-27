# DevFlow AI - Development Guide

## Setup Instructions

This guide provides instructions for setting up the DevFlow AI project for local development.

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- Git
- MongoDB (optional, can run in mock mode without it)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd dev-flow-ai
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install dependencies for both the server and client applications.

### Step 3: Set Up Environment Variables

1. The server app has a `.env` file for configuration:

```bash
# Server: dev-flow-ai/apps/server/.env
# MOCK_MODE=true enables development without a MongoDB connection
MOCK_MODE=true
PORT=3000
NODE_ENV=development
```

2. The web app also has a `.env` file:

```bash
# Web: dev-flow-ai/apps/web/.env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_GITHUB_AUTH_URL=/api/auth/github/login
```

### Step 4: Run the Application

Start both the server and client applications:

```bash
npm run dev
```

This command will start:
- Server: http://localhost:3000
- Web client: http://localhost:5173

## Development with Mock Mode

The application can run in "mock mode" which provides simulated data and authentication without requiring external services:

### Features Available in Mock Mode

1. **Authentication**: You can log in without a real GitHub account
2. **Projects**: Mock project data is provided
3. **Tasks**: Mock task data is provided
4. **API Keys**: Mock API key handling

### How to Use Mock Mode

1. Ensure `MOCK_MODE=true` is set in the server's `.env` file
2. Start the application with `npm run dev`
3. When you click "Login with GitHub", the server will simulate the OAuth flow and log you in with a mock user account

### Disabling Mock Mode

To use real MongoDB and GitHub authentication:

1. Set `MOCK_MODE=false` in the server's `.env` file
2. Ensure you have MongoDB running locally or provide a MongoDB Atlas connection string
3. Set up a GitHub OAuth App and update the GitHub credentials in the server's `.env` file

## Deployment

For deployment instructions, see the [DEPLOYMENT.md](./DEPLOYMENT.md) file.

## Troubleshooting

### Server Not Starting

If the server doesn't start, check:
- Port 3000 isn't already in use
- Environment variables are properly set
- MongoDB is running (if not using mock mode)

### Authentication Issues

If login doesn't work:
- In mock mode: check server console for error messages
- In real mode: verify GitHub OAuth credentials and callback URLs

## Project Structure

```
dev-flow-ai/
├── apps/
│   ├── server/     # Backend Express.js application
│   └── web/        # Frontend React application
├── packages/       # Shared packages
└── package.json    # Root package.json with dev scripts
```