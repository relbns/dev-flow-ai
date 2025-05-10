# DevFlow AI

DevFlow AI is an AI-assisted project and task management application designed to integrate deeply with GitHub and empower developers by enabling external AI agents to assist with and automate development tasks.

## Project Vision

To create an intelligent project and task management application that seamlessly integrates with GitHub and empowers developers by enabling AI agents (such as Cline, Claude Desktop, Copilot Agent, Cursor, etc.) to assist with and automate development tasks.

## Core Architecture

*   **Frontend:** React application (Vite, in `apps/web/`) for project/task management.
*   **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Supabase Edge Functions).
*   **Monorepo Structure:** npm workspaces managing:
    *   `apps/web`: The main web application.
    *   `packages/local-agent-cli`: A Node.js CLI tool for local development interaction.
    *   `supabase/functions`: Supabase Edge Functions hosting MCP tools.
*   **MCP (Model Context Protocol) Servers:**
    *   **Supabase MCP Server:** Hosted via Edge Functions for interacting with project/task data.
    *   **Local MCP Server:** To be hosted by the `local-agent-cli` for interacting with the local codebase.

## Key Features (V1 Highlights)

*   GitHub OAuth for user authentication.
*   Project and task management within the web application.
*   Scoped Paths within repositories and project-specific guidelines.
*   MCP tools for AI agents to:
    *   Read project/task data and update task statuses (via Supabase MCP).
    *   Read/write local files and execute `git` commands (via Local MCP).

## Getting Started

### Prerequisites

*   Node.js and npm
*   Supabase CLI (for backend development/deployment)

### Setup

1.  Clone the repository.
2.  Install root dependencies:
    ```bash
    npm install
    ```
3.  Navigate to the web application directory and install its dependencies:
    ```bash
    cd apps/web
    npm install
    cd ../..
    ```
4.  (Further setup for Supabase and local agent will be detailed as development progresses.)

### Running the Web Application (Development)

```bash
npm run dev
```
This will start the Vite development server for the React frontend.

### Running the Local Agent CLI

The local agent CLI provides tools for interacting with your local file system and git repository.

*   Show help:
    ```bash
    npm run local-agent:help
    ```
*   Say hello:
    ```bash
    npm run local-agent:hello
    ```
*   Get content of a file (e.g., its own package.json):
    ```bash
    npm run local-agent
    ```
*   Get git status:
    ```bash
    npm run local-agent:git:status
    ```
*   Get current git branch:
    ```bash
    npm run local-agent:git:branch
    ```

## Workspaces

This project uses npm workspaces:
*   `apps/web`: Frontend React application.
*   `packages/local-agent-cli`: Local agent CLI tool.
*   `supabase/functions`: Supabase Edge Functions.

(More details to be added as the project evolves.)
