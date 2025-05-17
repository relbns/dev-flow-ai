# DevFlow AI Local Agent CLI

The DevFlow AI Local Agent CLI allows you to interact with your local filesystem and git repository from the DevFlow AI system. It provides a secure way for Claude and other AI assistants to read and write files within a specified root directory.

## Installation

```bash
npm install -g @dev-flow-ai/local-agent-cli
```

Or use it directly from your project:

```bash
npx devflow-local-agent
```

## Quick Start

Simply run the agent in your project directory:

```bash
cd /your/project/directory
npx devflow-local-agent
```

This will:
1. Start the agent in stdio mode (for Claude)
2. Use your current directory as the project root
3. Auto-generate an API key if not configured

## Usage

The agent has two main modes:

### Stdio Mode (Default - for Claude)

```bash
npx devflow-local-agent
# or
npx devflow-local-agent start
```

This mode is used when interacting with Claude or other AI assistants that support the Model Context Protocol (MCP).

### HTTP Server Mode

```bash
npx devflow-local-agent start-server
```

This starts an HTTP server that can be used by web applications to interact with your local filesystem.

## Commands

- `npx devflow-local-agent` - Start the agent in stdio mode (default)
- `npx devflow-local-agent start-server` - Start an HTTP server
- `npx devflow-local-agent configure` - Configure the agent settings
- `npx devflow-local-agent status` - Check if an agent is running
- `npx devflow-local-agent stop` - Stop a running agent
- `npx devflow-local-agent switch-root [path]` - Change the root directory

## Configuration

To configure the agent, run:

```bash
npx devflow-local-agent configure
```

This will prompt you for:
- API Key (auto-generated if not provided)
- Server port (default: 52173)
- Project root path (default: current directory)
- Backend API URL (default: http://localhost:3000/api)

## Singleton Behavior

The DevFlow AI Local Agent is designed to run as a singleton - only one instance can run at a time. If you try to start a second instance, you'll be given options to:

1. Use the existing agent
2. Switch the root directory
3. Stop the existing agent and start a new one

## Environment Variables

The agent respects the following environment variables:

- `DEVFLOW_MAX_ROOT` - The project root directory
- `DEVFLOW_API_KEY` - The API key for authentication
- `DEVFLOW_LOCAL_AGENT_PORT` - The port for the HTTP server
- `DEVFLOW_LOCAL_AGENT_PROJECT_ROOT` - The project root directory

## Available Tools

The agent provides the following tools:

### Local Tools

- `get_local_file_content` - Read a file from the local filesystem
- `write_local_file_content` - Write a file to the local filesystem
- `list_local_files` - List files and directories
- `execute_git_command` - Execute a Git command

### Remote Tools

- `remote_list_projects` - List projects from the DevFlow AI backend
- `remote_get_project_details` - Get project details
- `remote_list_tasks` - List tasks for a project
- `remote_get_task_details` - Get task details
- `remote_create_project` - Create a new project
- `remote_create_task` - Create a new task
- `remote_update_task_status` - Update a task's status
- `remote_add_comment_to_task` - Add a comment to a task

## Security

The agent is designed with security in mind:

- File operations are restricted to the specified project root
- Git commands are limited to safe operations
- API key authentication for HTTP server mode
- Configurable permissions for remote access
