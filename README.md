# DevFlow AI

DevFlow AI is an AI-assisted project and task management application designed to integrate deeply with GitHub. It empowers developers by enabling external AI agents (like Cline, Claude Desktop, etc.) to understand project context, assist with, and automate development tasks by interacting with both cloud-hosted project data and the user's local codebase via Model Context Protocol (MCP) servers.

## Project Vision

To create an intelligent project and task management application that seamlessly integrates with GitHub. It empowers developers by enabling AI agents to:
*   Understand project context, guidelines, and task details.
*   Assist with and automate development tasks by interacting with:
    *   Cloud-hosted project data (via a Supabase MCP Gateway).
    *   The user's local codebase (via a user-run Local Agent MCP Server).
*   Streamline workflows from idea to deployment within a unified platform.

## Core Architecture

*   **Web Application (`apps/web`):** React (Vite, Tailwind CSS, shadcn/ui) frontend for project/task management, GitHub login, API key generation, Kanban boards, etc.
*   **Backend & Database (`supabase`):** Supabase for PostgreSQL database, GitHub OAuth, and Edge Functions hosting the Supabase MCP Gateway.
*   **Supabase MCP Gateway (`supabase/functions/mcp-gateway`):** A Supabase Edge Function that serves as a secure entry point for AI agents (using API keys) to interact with project/task data stored in Supabase.
*   **Local Agent CLI (`packages/local-agent-cli`):** A Node.js (ES Modules) CLI tool that users run in their local project directory. It hosts a local MCP server, allowing authenticated AI agents (using the same API key) to perform sandboxed file system and Git operations.
*   **Monorepo Structure:** npm workspaces manage `apps/web`, `packages/local-agent-cli`, and `supabase/functions`.

## Key Features (V1 - Current & Planned)

*   **User Authentication:** Secure login via GitHub OAuth.
*   **API Key Management:** Users can generate/revoke API keys in the web app for AI agents.
*   **Project & Task Management:** Web UI for creating and managing projects (with guidelines, scoped paths) and tasks (with descriptions, status, comments, Kanban board).
*   **Supabase MCP Gateway:** Provides AI agents with tools to manage projects, tasks, and comments in the Supabase database.
*   **Local Agent MCP Server:** Provides AI agents with tools to read/write local files, list files, and execute Git commands within a user-defined project root.
    *   CLI commands: `devflow-local-agent configure` (to save API key, port, root path) and `devflow-local-agent start-server` (to run the agent).
*   **(Paused) Organization Scoping:** Functionality to link projects to GitHub organizations and filter views accordingly.
*   **(Paused) Team Members:** Functionality to assign project leads and team members to projects.

## Getting Started

### Prerequisites

*   Node.js (v18+) and npm
*   Supabase CLI (install via `npm install -g supabase`)
*   Git

### Setup

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd dev-flow-ai 
    ```
2.  **Install Dependencies:**
    (Installs for root, `apps/web`, and `packages/local-agent-cli`)
    ```bash
    npm install
    ```
3.  **Supabase Local Development:**
    *   Ensure Docker is running.
    *   Start Supabase local services:
        ```bash
        supabase start
        ```
    *   Apply database migrations (if this is the first time or new migrations exist):
        ```bash
        supabase db reset --local # Resets local DB and applies all migrations
        # OR if you have existing local data you want to keep and only apply new migrations:
        # supabase migration up 
        ```
    *   Note the local Supabase URL and anon key from the `supabase start` output.
4.  **Configure Web Application (`apps/web/.env`):**
    *   Create or update `apps/web/.env`.
    *   Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your **local** Supabase instance details (from `supabase start` output) for local development.
        ```env
        VITE_SUPABASE_URL=http://127.0.0.1:54321
        VITE_SUPABASE_ANON_KEY=your_local_supabase_anon_key
        ```
5.  **Link Local Agent CLI (Optional, for global command):**
    *   Navigate to the local agent package:
        ```bash
        cd packages/local-agent-cli
        ```
    *   Link the package:
        ```bash
        npm link
        ```
        (If you get an EEXIST error, run `npm unlink` first, or `rm /path/to/existing/devflow-local-agent` as shown in the error, then `npm link` again.)
    *   Navigate back to the monorepo root: `cd ../..`

### Running the System for Development

1.  **Start Supabase Local Services (if not already running):**
    ```bash
    supabase start
    ```
2.  **Run the Web Application:**
    ```bash
    npm run dev 
    # This runs `npm run dev --workspace=@dev-flow-ai/web`
    ```
    Access at `http://localhost:8080` (or the port Vite shows). Log in via GitHub.
3.  **Generate an API Key:**
    *   In the web app, go to Settings -> Integrations -> API Keys.
    *   Generate a new API key. Copy it.
4.  **Configure and Run the Local Agent CLI:**
    *   Open a new terminal in the monorepo root.
    *   Configure the agent (one-time setup, or to change settings):
        ```bash
        devflow-local-agent configure
        ```
        When prompted, enter the API key you copied, desired port (e.g., 52173), and project root (e.g., `.` for the current monorepo root, or an absolute path to a specific project).
    *   Start the agent:
        ```bash
        devflow-local-agent start-server
        # Or simply (if configured):
        # devflow-local-agent
        # Or with explicit options (overrides config):
        # devflow-local-agent start-server --api-key YOUR_COPIED_API_KEY --root . --port 52173
        ```

## Development Workflow

*   **Web App:** Make changes in `apps/web`. Vite provides HMR.
*   **Supabase Functions/Schema:**
    *   Edge Functions: Modify files in `supabase/functions`. Deploy with `supabase functions deploy <function_name> --project-ref <your_LOCAL_or_REMOTE_project_ref>`.
    *   Database Schema: Create new migration files in `supabase/migrations` (e.g., `supabase migration new <migration_name>`). Apply locally with `supabase migration up` or `supabase db reset --local`.
*   **Local Agent CLI:** Make changes in `packages/local-agent-cli`. If `npm link`ed, changes are live. Restart the agent to see changes in the running server.

## Testing with `api.http`

The `api.http` file contains requests for testing:
*   Supabase MCP Gateway tools.
*   Direct Supabase Edge Function calls (for UI-related functions).
*   Local Agent MCP Server tools.

Update the variables at the top of `api.http` (JWT, API keys, resource IDs, local agent port) before running requests.

(More details on specific features, advanced configuration, and deployment to be added as the project evolves.)
