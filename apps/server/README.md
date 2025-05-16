# DevFlow AI Backend (continued)

## Features (continued)

- Project and task management
- GitHub repository integration
- MCP Gateway for AI agents
- Secure token refresh mechanism
- Scoped API access

## Tech Stack

- Express.js server (JavaScript with ES Modules)
- MongoDB for database
- Node.js environment
- GitHub OAuth for authentication
- Vercel Functions for serverless deployment

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB)
- GitHub OAuth App credentials

### Installation

1. Clone the repository:
   git clone https://github.com/your-username/devflow-ai-backend.git
   cd devflow-ai-backend

2. Install dependencies:
   npm install

3. Create a `.env` file in the root directory with the following variables:
   Server Configuration
   PORT=3000
   NODE_ENV=development
   MongoDB
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/devflow-ai
   JWT
   JWT_SECRET=your-jwt-secret-key
   GitHub OAuth
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
   Frontend
   FRONTEND_URL=http://localhost:5173
   CORS Configuration
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

4. Run the development server:
   npm run dev

### Setting up GitHub OAuth

1. Go to GitHub Settings > Developer Settings > OAuth Apps > New OAuth App
2. Fill in the following:

- Application name: DevFlow AI (Dev)
- Homepage URL: http://localhost:5173
- Authorization callback URL: http://localhost:3000/api/auth/github/callback

3. Register the application and note the Client ID and Client Secret
4. Update your `.env` file with these credentials

## API Documentation

### Authentication

- `POST /api/auth/github/login` - Generate GitHub OAuth URL
- `GET /api/auth/github/callback` - GitHub OAuth callback
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh-token` - Refresh JWT token

### Projects

- `POST /api/projects` - Create new project
- `GET /api/projects` - Get all user's projects
- `GET /api/projects/:projectId` - Get specific project
- `PATCH /api/projects/:projectId` - Update project
- `DELETE /api/projects/:projectId` - Delete project
- `POST /api/projects/:projectId/members` - Add project member
- `PATCH /api/projects/:projectId/members/:memberId` - Update project member
- `POST /api/projects/:projectId/sync-collaborators` - Sync GitHub collaborators

### Tasks

- `POST /api/tasks` - Create new task
- `GET /api/tasks/:taskId` - Get specific task
- `GET /api/tasks/project/:projectId` - Get tasks for project
- `PATCH /api/tasks/:taskId` - Update task
- `DELETE /api/tasks/:taskId` - Delete task
- `POST /api/tasks/:taskId/comments` - Add comment to task
- `DELETE /api/tasks/:taskId/comments/:commentId` - Delete comment

### GitHub Integration

- `GET /api/github/organizations` - Get user's GitHub organizations
- `GET /api/github/organizations/:orgName/repos` - Get organization repositories
- `GET /api/github/repos` - Get user's repositories
- `GET /api/github/repos/:owner/:repo/collaborators` - Get repository collaborators
- `GET /api/github/repos/:owner/:repo/contents/*` - Get repository content

### API Keys

- `POST /api/api-keys` - Create new API key
- `GET /api/api-keys` - Get user's API keys
- `DELETE /api/api-keys/:keyId` - Revoke API key
- `PATCH /api/api-keys/:keyId` - Update API key

### MCP Gateway (For AI Agents)

- `GET /api/mcp/projects/:projectId/context` - Get project context
- `GET /api/mcp/projects/:projectId/tasks` - Get project tasks
- `GET /api/mcp/projects/:projectId/files/*` - Get file content
- `POST /api/mcp/projects/:projectId/tasks` - Create task
- `PATCH /api/mcp/projects/:projectId/tasks/:taskId` - Update task
- `POST /api/mcp/projects/:projectId/tasks/:taskId/comments` - Add comment to task

## Deployment

### Deploying to Vercel

1. Install Vercel CLI:
   npm i -g vercel

2. Login to Vercel:
   vercel login

3. Deploy:
   vercel

4. Set environment variables in the Vercel dashboard

## Local Development with the CLI

The DevFlow AI Local Agent CLI can connect to this backend through the MCP Gateway. To enable local development:

1. Generate an API key with the appropriate permissions
2. Configure the CLI to use your local backend URL
3. Set the API key in the CLI configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -am 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
