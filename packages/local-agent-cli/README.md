# DevFlow AI - Local Agent CLI

The DevFlow AI Local Agent CLI (`devflow-local-agent`) is a command-line tool that runs on the user's machine. It provides secure, sandboxed access to the local file system and Git operations. This agent can be interacted with in two ways:

1.  **HTTP Server Mode:** For direct access, testing, or integration with local scripts/tools via HTTP requests.
2.  **Stdio MCP Mode:** For integration with AI agent platforms (like Claude Desktop or Cline) that use the Model Context Protocol (MCP) over standard input/output.

## Features

*   **File System Access:**
    *   Read file content (`get_local_file_content`)
    *   Write file content (`write_local_file_content`)
    *   List files and directories (`list_local_files`)
*   **Git Operations:**
    *   Execute common Git commands (`execute_git_command` for status, log, add, commit, checkout, push, pull, branch)
*   **Security:**
    *   API Key authentication for all operations.
    *   Project root sandboxing: All operations are confined to a specified project root directory.
*   **Dual Mode Operation:**
    *   Runs as an HTTP server for direct access.
    *   Runs as an stdio-based MCP server for AI agent integration.

## Installation & Configuration

The Local Agent CLI is part of the DevFlow AI monorepo and is typically run from within the `packages/local-agent-cli` directory.

### Configuration (`configure` command)

Run `devflow-local-agent configure` to set up default values for:
*   API Key (used for both HTTP and Stdio MCP modes)
*   Default Port (for HTTP server mode)
*   Default Project Root Path (for HTTP server mode if not specified at startup)

These values are saved to a local configuration file (`~/.devflow-agent-config.json`).

Configuration can also be provided via environment variables or command-line options, which override saved defaults.

*   `DEVFLOW_LOCAL_AGENT_API_KEY` or `--api-key <key>`
*   `DEVFLOW_LOCAL_AGENT_PORT` or `--port <port_number>` (HTTP mode)
*   `DEVFLOW_LOCAL_AGENT_PROJECT_ROOT` or `--root <path>` (HTTP mode)

## Usage

### 1. HTTP Server Mode

This is the default mode. It starts an HTTP server allowing tools to be called via POST requests to `/mcp/:toolName`.

**Start the server:**
```bash
# From packages/local-agent-cli directory
npm start
# or
node index.js start-server --api-key YOUR_API_KEY --root /path/to/your/project
```

The server will start (default: `http://localhost:52173`). All requests to `/mcp/*` endpoints require an `X-DevFlow-API-Key` header.

**Example HTTP Tool Call (curl):**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-DevFlow-API-Key: YOUR_API_KEY" \
  -d '{"filePath": "README.md"}' \
  http://localhost:52173/mcp/get_local_file_content
```
In HTTP mode, the `projectRoot` for operations is determined by the `--root` option or `DEVFLOW_LOCAL_AGENT_PROJECT_ROOT` environment variable used when starting the server.

### 2. Stdio MCP Mode

This mode is for integration with MCP hosts like Claude Desktop. The agent communicates over standard input/output.

**Start in Stdio MCP Mode:**
```bash
# From packages/local-agent-cli directory
node index.js mcp-stdio
```

**Environment Variables for Stdio MCP Mode (set by MCP Host):**
*   `DEVFLOW_API_KEY`: (Required) The API key for authentication.
*   `DEVFLOW_MAX_ROOT`: (Optional) An absolute path that acts as an ultimate sandbox. If set, all `projectRoot` arguments in tool calls must be within this directory.

**Tool Calls in Stdio MCP Mode:**
The MCP host (e.g., Claude Desktop) will send JSON-RPC messages over stdin to call tools. Each tool call **must** include a `projectRoot` argument specifying the absolute path for the operation's context.

**Example Tool Definition (get_local_file_content):**
```json
{
  "name": "get_local_file_content",
  "description": "Reads the content of a file...",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectRoot": { "type": "string", "description": "Absolute path to the project root directory." },
      "filePath": { "type": "string", "description": "Path to the file, relative to projectRoot." }
    },
    "required": ["projectRoot", "filePath"]
  }
}
```
The agent will use the `projectRoot` from the tool call arguments to perform its sandboxed operations.

## Available Tools (for both modes)

The underlying utility functions are shared. The main difference is how `projectRoot` is determined:
*   **HTTP Mode:** `projectRoot` is fixed at server startup.
*   **Stdio MCP Mode:** `projectRoot` is passed dynamically with each tool call.

1.  **`get_local_file_content`**
    *   Description: Reads file content.
    *   HTTP Args: `{ "filePath": "path/to/file.txt" }`
    *   Stdio MCP Args: `{ "projectRoot": "/abs/path/to/project", "filePath": "path/to/file.txt" }`
2.  **`write_local_file_content`**
    *   Description: Writes content to a file.
    *   HTTP Args: `{ "filePath": "path/to/file.txt", "content": "Hello" }`
    *   Stdio MCP Args: `{ "projectRoot": "/abs/path/to/project", "filePath": "path/to/file.txt", "content": "Hello" }`
3.  **`list_local_files`**
    *   Description: Lists files and directories.
    *   HTTP Args: `{ "directoryPath": "path/to/dir", "recursive": false, "ignore": [".git"] }`
    *   Stdio MCP Args: `{ "projectRoot": "/abs/path/to/project", "directoryPath": "path/to/dir", ... }`
4.  **`execute_git_command`**
    *   Description: Executes a Git command.
    *   HTTP Args: `{ "command_args": ["status"] }` (runs in server's `currentProjectRoot`)
    *   Stdio MCP Args: `{ "projectRoot": "/abs/path/to/project", "executionCwd": ".", "command_args": ["status"] }`

Refer to `index.js` for detailed input schemas for Stdio MCP mode.
