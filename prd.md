**Product Requirements Document: CodeHub Kanban Flow (AI-Integrated) - V1**

**1. Project Vision & Goals**

- **Vision:** To create an intelligent project and task management application that seamlessly integrates with GitHub and empowers developers by enabling AI agents (such as Cline, Claude Desktop, Copilot Agent, Cursor, etc.) to assist with and automate development tasks.

- **V1 Goals:**

  - Establish a core web application for users to manage projects and tasks.
  - Implement GitHub OAuth for user authentication and linking of repositories.
  - Define a clear structure for projects, including the concept of "Scoped Paths" within repositories and project-specific guidelines.
  - Develop a set of MCP (Model Context Protocol) tools hosted on a Supabase backend, allowing AI agents to read project/task data and update task statuses.
  - Develop a lightweight local agent (CLI tool) run by the user, exposing a local MCP server for AI agents to interact with the local file system and execute `git` commands.
  - Enable a basic end-to-end workflow where an AI can retrieve task information, access local code context, and report progress.

**2. Target Users**

- Software developers and development teams who want to leverage AI for enhanced productivity and task automation within a structured project management environment.

**3. Core Architectural Components**

- **Web Application:**

  - **Frontend:** Existing React application (Vite, `src/` directory). This will be enhanced to include UI for project/task management, GitHub linking, user login, task boards, etc.
  - **Backend Logic:** Supabase (PostgreSQL for database, Auth for GitHub OAuth, Edge Functions for business logic and hosting the Supabase MCP Server).

- **Supabase MCP Server:** Hosted via Supabase Edge Functions, providing a RESTful API for AI agents to interact with project and task data.

- **Local Agent:** A lightweight Command Line Interface (CLI) tool, developed in Node.js, run by the user in their local development environment. This agent will host a local HTTP MCP server.

- **External AI Agents:** Third-party AI tools (e.g., Cline, Claude Desktop, custom scripts) that will consume the APIs exposed by both the Supabase MCP Server and the Local MCP Server.

**4. Key Features (V1)**

- **User Authentication:** Secure login via GitHub OAuth, managed by Supabase Auth.

- **Project Management:**

  - Users can create projects within the web application.
  - Each project is linked to a single primary GitHub repository.
  - Users can define multiple "Scoped Paths" within a project, each with a `name`, `path` (directory in the repo), and `notes`/`guidelines`. If no scoped paths are defined, the entire repository is the default scope.
  - Users can add project-level `guidelines` (text-based instructions/conventions).

- **Task Management:**

  - Users can create tasks within projects.
  - Each task includes a `title` (mandatory), `description` (optional), and can be associated with one of the project's "Scoped Paths" (optional).
  - Tasks follow a defined status workflow: `Backlog` -> `To Do` -> `In Progress` -> `In Review` -> `Done`.
  - Tasks can have associated `branches` and `pull_request_urls` linked to them.

- **MCP Integration:**

  - AI agents can create, read, and update projects and tasks via the Supabase MCP Server.
  - AI agents can read/write local files and execute `git` commands via the Local MCP Server.

**5. Supabase MCP Server - V1 Toolset (API Endpoints)** _(Hosted on Supabase Edge Functions, e.g., `/mcp/tool_name`)_ 1. `create_project(projectName: string, githubRepoURL: string, scopedPaths: [{name: string, path: string, notes: string}], guidelines: string[])` 2. `get_project_details(project_id: string)` (Returns project info, scoped paths, guidelines) 3. `list_projects()` 4. `create_task(project_id: string, title: string, description?: string, associated_scoped_path_name?: string)` 5. `get_task_details(task_id: string)` (Returns task info, status, linked branches/PRs) 6. `list_tasks(project_id: string, status_filter?: string, scoped_path_filter?: string)` 7. `update_task_status(task_id: string, new_status: string, current_branch?: string, pull_request_url?: string)` 8. `add_comment_to_task(task_id: string, comment_text: string, author: string)` (Author could be user or AI agent ID)

**6. Local MCP Server (Hosted by Local Agent CLI) - V1 Toolset (API Endpoints)** _(Hosted on `http://localhost:<port>`, e.g., `/mcp/tool_name`)_ 1. `get_local_file_content(filePath: string)` 2. `write_local_file_content(filePath: string, content: string)` 3. `execute_git_command(command_args: string[])` (e.g., `["checkout", "-b", "new-branch"]`, `["add", "."]`, `["commit", "-m", "message"]`, `["push"]`, `["status"]`, `["rev-parse", "--abbrev-ref", "HEAD"]` for current branch) 4. `list_local_files(directoryPath: string, recursive?: boolean)`

**7. Database Schema - Initial Design (Supabase/PostgreSQL)**

- **`users`:** (Managed by Supabase Auth) `id`, `email`, GitHub profile info, etc.
- **`projects`:** `id` (UUID, PK), `user_id` (FK to users), `name` (text), `github_repo_url` (text), `created_at`, `updated_at`.
- **`project_guidelines`:** `id` (UUID, PK), `project_id` (FK to projects), `guideline_text` (text), `order` (integer).
- **`scoped_paths`:** `id` (UUID, PK), `project_id` (FK to projects), `name` (text, e.g., "Frontend"), `path_in_repo` (text, e.g., "/apps/frontend"), `notes` (text), `created_at`, `updated_at`.
- **`tasks`:** `id` (UUID, PK), `project_id` (FK to projects), `scoped_path_id` (FK to scoped_paths, nullable), `title` (text), `description` (text, nullable), `status` (text, e.g., "To Do", "In Progress"), `created_at`, `updated_at`, `current_branch` (text, nullable), `pull_request_url` (text, nullable).
- **`task_comments`:** `id` (UUID, PK), `task_id` (FK to tasks), `user_id` (FK to users, nullable if AI comment), `author_display_name` (text), `comment_text` (text), `created_at`.

**8. Technology Stack Summary**

- **Frontend:** Existing React application (Vite, JavaScript/JSX, CSS - specific CSS framework like Tailwind to be confirmed/integrated).
- **Backend & Database:** Supabase (PostgreSQL, Supabase Auth for GitHub OAuth, Supabase Edge Functions using JavaScript/TypeScript).
- **Local Agent CLI:** Node.js (JavaScript/TypeScript).

**9. V1 Implementation Order / Prioritization** 1. **Supabase Setup:** Initialize Supabase project, configure GitHub Auth (requesting `repo` scope), design and create initial DB tables based on schema above. 2. **Web App (Existing Frontend) - User Login:** Integrate Supabase Auth into the existing React app to enable "Login with GitHub." Store/retrieve user session. 3. **Web App (Existing Frontend) - Project Creation & Scoped Paths UI:** \* Develop React components/pages for users to create new projects. \* UI to input project name, GitHub repository URL. \* UI to define one or more "Scoped Paths" (name, path in repo, notes). \* UI to add project-level `guidelines`. \* Functionality to save this data to Supabase. 4. **Web App (Existing Frontend) - Task Creation UI:** \* Develop UI for creating tasks within a selected project. \* Input for title, description. \* Option to associate with a "Scoped Path" from the project. \* Save task data to Supabase (default status: "Backlog" or "To Do"). 5. **Supabase MCP Server - Core Implementation:** \* Implement initial Supabase Edge Functions for: `create_project`, `get_project_details`, `create_task`, `get_task_details`, `list_projects`, `list_tasks`. 6. **Local Agent (CLI) - V1:** \* Develop basic Node.js CLI tool. \* On startup, it launches a local HTTP server (e.g., using Express.js or Fastify). \* Implement Local MCP endpoints: `get_local_file_content`, `execute_git_command` (initially supporting `git status` and `git rev-parse --abbrev-ref HEAD`). \* User runs this CLI from the root of their local git repository. 7. **End-to-End Test (Conceptual/Manual):** \* Manually use a tool (Postman, curl) to call Supabase MCP: `create_project`, then `create_task`. \* Call Supabase MCP `get_task_details` to retrieve task info. \* Run the Local Agent CLI in a sample repository. \* Call Local MCP `get_local_file_content` for a file in that repo. \* Call Local MCP `execute_git_command` for `git status`. 8. **Web App (Existing Frontend) - Display & Workflow:** \* Develop UI to display projects and their tasks (e.g., simple list or basic Kanban board). \* Implement UI for users to manually change task statuses. \* Display task details, including associated Scoped Path, guidelines. 9. **Supabase MCP Server - Remaining V1 Tools:** Implement `update_task_status`, `add_comment_to_task`. 10. **Local Agent (CLI) - Expanded Git Commands:** Add support for `git checkout`, `add`, `commit`, `push` to `execute_git_command` in Local MCP. 11. **Refine & Test AI Workflow:** Test a more complete AI interaction flow.
