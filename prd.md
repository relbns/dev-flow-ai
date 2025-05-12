**Product Requirements Document: DevFlow AI - V1**

**1. Project Vision & Goals**

*   **Vision:** To create an intelligent project and task management application ("DevFlow AI") that seamlessly integrates with GitHub. It empowers developers by enabling external AI agents (such as Cline, Claude Desktop, Copilot Agent, Cursor, etc.) to understand project context, assist with, and automate development tasks by interacting with both cloud-hosted project data and the user's local codebase via Model Context Protocol (MCP) servers.

*   **V1 Goals:**
    1.  Establish a core web application for users to manage projects, tasks, and project-specific guidelines.
    2.  Implement GitHub OAuth for user authentication.
    3.  Develop a Supabase-hosted MCP Gateway allowing authenticated AI agents (via user-generated API keys) to interact with project/task data.
    4.  Develop a lightweight Local Agent (CLI tool) run by the user, exposing a local MCP server. This server will allow authenticated AI agents (using the same API key) to interact with the local file system and execute `git` commands within a sandboxed project root.
    5.  Enable an end-to-end workflow where an AI agent can:
        *   Retrieve project and task information via the Supabase MCP Gateway.
        *   Access local code context via the Local Agent.
        *   Modify local files and perform Git operations via the Local Agent.
        *   Update task status or add comments via the Supabase MCP Gateway.
    6.  Integrate basic organization-level project scoping (fetching user's GitHub orgs, associating projects with orgs, filtering projects by org context), contingent on resolving GitHub OAuth App permissions for organization access. *(Currently Paused)*
    7.  Implement basic project team member association (Project Lead, Developer, etc.), allowing members to be linked to projects. *(Currently Paused)*

**2. Target Users**

*   Software developers and development teams seeking to integrate AI assistance deeply into their project management and development workflows for enhanced productivity, context-aware automation, and streamlined collaboration.

**3. Core Architectural Components**

*   **Web Application (`apps/web`):**
    *   **Frontend:** React application (Vite, JavaScript/JSX, Tailwind CSS, shadcn/ui). Provides UI for project/task management, GitHub login, API key generation, task boards, etc.
    *   **Backend Logic:** Supabase (PostgreSQL for database, Auth for GitHub OAuth, Edge Functions for business logic and hosting the Supabase MCP Gateway).

*   **Supabase MCP Gateway (`supabase/functions/mcp-gateway`):** Hosted via Supabase Edge Functions. Provides a RESTful API for AI agents (authenticated via `X-DevFlow-API-Key`) to interact with project and task data stored in Supabase. It uses a `service_role_key` to interact with data on behalf of the user associated with the API key.

*   **Local Agent CLI (`packages/local-agent-cli`):** A Node.js CLI tool run by the user in their local development environment.
    *   Hosts a local HTTP MCP server (default port: 52173).
    *   Requires configuration with a user-generated API key and a project root path (for sandboxing).
    *   Exposes tools for local file system and Git operations to AI agents authenticated with the same API key.

*   **External AI Agents:** Third-party AI tools or services (e.g., Cline, Claude Desktop, custom scripts) that consume the MCP APIs exposed by both the Supabase MCP Gateway and the Local Agent MCP Server.

**4. Key Features (V1)**

*   **User Authentication:** Secure login via GitHub OAuth (managed by Supabase Auth).
*   **API Key Management:** Users can generate and revoke API keys in the web app settings for AI agents to use.
*   **Project Management:**
    *   Create projects, optionally linked to a GitHub repository and a GitHub Organization (if org feature is active).
    *   Define "Scoped Paths" (named directories within a project's repo with notes).
    *   Add project-level `guidelines` (text-based instructions/conventions).
    *   (Paused) Associate Project Leads and Team Members with roles.
*   **Task Management:**
    *   Create tasks within projects (title, description, status, optional Scoped Path association).
    *   Kanban-style board for task status updates (`Backlog`, `To Do`, `In Progress`, `In Review`, `Done`).
    *   Task commenting (users and AI agents).
*   **MCP Integration:**
    *   **Supabase MCP Gateway:** Enables AI agents to manage projects, tasks, and comments in the Supabase database.
    *   **Local Agent MCP Server:** Enables AI agents to read/write local files, list files, and execute `git` commands within the user's sandboxed project directory.
*   **(Paused) Organization Context Switching:** UI in the header to switch between "Personal" projects and projects associated with the user's GitHub organizations. Project lists and creation would be filtered by this context.

**5. Supabase MCP Gateway - V1 Toolset (API Endpoints)**
    *(All tools called via `POST /mcp-gateway` with `tool_name` and `arguments` in body, authenticated by `X-DevFlow-API-Key`)*
    *   `create_project(projectName, githubRepoURL?, description?, guidelines?, scopedPaths?, github_org_id?, github_org_login?)`
    *   `get_project_details(project_id)`
    *   `list_projects(github_org_id?)` (org_id optional for filtering)
    *   `create_task(project_id, title, description?, scoped_path_id?, status?)`
    *   `get_task_details(task_id)`
    *   `list_tasks(project_id, status_filter?, scoped_path_id?)`
    *   `update_task_status(task_id, new_status, current_branch?, pull_request_url?)`
    *   `add_comment_to_task(task_id, comment_text, author_display_name?)`
    *   (Future for Team Members) `add_project_member`, `remove_project_member`, `update_project_member_role`

**6. Local Agent MCP Server - V1 Toolset (API Endpoints)**
    *(Hosted on `http://localhost:<port>/mcp/:toolName`, authenticated by `X-DevFlow-API-Key`)*
    *   `get_local_file_content(filePath: string)`
    *   `write_local_file_content(filePath: string, content: string)`
    *   `list_local_files(directoryPath: string, recursive?: boolean, ignore?: string[])`
    *   `execute_git_command(command_args: string[])` (supports a safe subset of Git commands)
    *   `GET /status` (unprotected, for health checks)

**7. Database Schema - Key Tables (Supabase/PostgreSQL)**
*   **`users`**: (Supabase Auth)
*   **`projects`**: `id`, `user_id`, `name`, `description`, `github_repo_url`, `github_org_id`, `github_org_login`, `created_at`, `updated_at`.
*   **`project_guidelines`**: `id`, `project_id`, `guideline_text`, `order`.
*   **`scoped_paths`**: `id`, `project_id`, `name`, `path_in_repo`, `notes`.
*   **`tasks`**: `id`, `project_id`, `scoped_path_id`, `title`, `description`, `status`, `current_branch`, `pull_request_url`.
*   **`task_comments`**: `id`, `task_id`, `user_id`, `author_display_name`, `comment_text`.
*   **`user_api_keys`**: `id`, `user_id`, `name`, `key_hash`, `key_prefix`, `last_used_at`, `expires_at`.
*   **(Paused) `project_members`**: `id`, `project_id`, `user_id`, `github_user_id`, `github_username`, `name_override`, `avatar_url_override`, `role`.

**8. Technology Stack Summary**
*   **Frontend:** React (Vite, JavaScript/JSX, Tailwind CSS, shadcn/ui).
*   **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Supabase Edge Functions using TypeScript).
*   **Local Agent CLI:** Node.js (ES Modules, Express.js, Commander.js).

**9. V1 Implementation Status & Next Steps**

1.  **Supabase Setup & Core Schema:** Done.
2.  **Web App - User Login (GitHub OAuth):** Done.
3.  **Web App - API Key Management UI:** Done.
4.  **Web App - Project/Task Creation & Display (Basic):** Largely done, ongoing UI polish.
    *   Project creation dialog functional.
    *   Task creation dialog functional.
    *   Project list page (`ProjectsPage.jsx`) functional.
    *   Project detail page (`Project.jsx`) functional with Kanban board.
    *   Task detail page (`TaskDetail.jsx`) functional with comments.
5.  **Supabase MCP Gateway & Tools:** Core data tools implemented and tested.
6.  **Local Agent CLI - Scaffolding & Basic Server:**
    *   ES Module project setup.
    *   CLI command structure (`devflow-local-agent configure`, `start-server`).
    *   Persistent configuration for API key, port, root path.
    *   Express server with API key authentication and sandboxing for project root.
    *   MCP endpoints for `get_local_file_content`, `write_local_file_content`, `list_local_files`, `execute_git_command` are defined.
    *   **NEXT:** Thoroughly test these Local Agent tool endpoints.
7.  **(Paused) Organization Scoping:** Backend function `get-github-orgs-via-token` created. Frontend `Layout.jsx` logic to fetch/pass orgs is in place but commented out pending GitHub org access verification by user. `Header.jsx` and `ProjectsPage.jsx` have initial support.
8.  **(Paused) Project Team Members:** `project_members` table created. `add-project-member` Edge Function created. Further backend and UI work pending.
9.  **AI Agent Integration Strategy:** High-level plan defined (AI uses Gateway for cloud data, Local Agent for local actions). Detailed implementation for a specific AI agent (e.g., Claude Desktop) is a next major phase.

**10. Future Considerations (Post-V1 / V1.x)**
*   **Local Agent Enhancements:**
    *   More robust sandboxing and security for file/Git operations.
    *   Expanded set of allowed Git commands.
    *   Support for running project-specific scripts (e.g., linters, tests) via Local Agent (requires careful security design).
    *   Auto-discovery or registration of Local Agent by web app/AI clients.
    *   Secure API key storage (e.g., OS keychain).
*   **Web App UI/UX Polish:**
    *   Advanced loaders, animations.
    *   Full implementation of all placeholder actions (edit/delete on all relevant items).
    *   Richer task details (assignees, due dates, priorities).
    *   Notifications system.
*   **Deeper GitHub Integration:**
    *   Linking PRs/issues directly to tasks.
    *   Fetching collaborators/org members for team suggestions.
*   **AI Agent Capabilities:**
    *   More sophisticated AI workflows (e.g., AI suggests PRD, AI auto-fixes bugs based on error logs).
    *   AI-driven project planning and task breakdown.
*   **Monitoring & Reporting:** Dashboards for project progress, team activity.
