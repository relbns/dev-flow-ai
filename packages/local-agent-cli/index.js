#!/usr/bin/env node

import dotenv from 'dotenv';
import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';
import { readConfig, writeConfig } from './configManager.js';
import {
  Server as McpServer
} from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { checkAgentRunning, getLockInfo } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const program = new Command();

const INITIAL_CWD = process.cwd();
let currentApiKey = null; // For authenticating incoming requests TO this agent's HTTP server
let currentProjectRoot = INITIAL_CWD;
const DEFAULT_PORT = 52173;
const DEFAULT_SUPABASE_URL = 'https://xfoxoiurhhqjjhqhoaaf.supabase.co';
let PORT = DEFAULT_PORT;

// Helper to read package.json for version
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

// --- Utility Functions ---
function stripAnsi (str) {
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  return str.replace(ansiRegex, '');
}

function getFileContent (filePath, projectRoot) {
  const absoluteFilePath = path.resolve(projectRoot, filePath);
  if (!absoluteFilePath.startsWith(path.resolve(projectRoot))) {
    throw new Error(`Access denied: File path "${filePath}" is outside the allowed project root "${projectRoot}".`);
  }
  if (!fs.existsSync(absoluteFilePath)) {
    throw new Error(`File not found at ${absoluteFilePath}`);
  }
  return fs.readFileSync(absoluteFilePath, 'utf8');
}

function writeLocalFileContent (filePath, content, projectRoot) {
  const absoluteFilePath = path.resolve(projectRoot, filePath);
  if (!absoluteFilePath.startsWith(path.resolve(projectRoot))) {
    throw new Error(`Access denied: File path "${filePath}" is outside the allowed project root "${projectRoot}".`);
  }
  try {
    fs.outputFileSync(absoluteFilePath, content, 'utf8');
    return `Content successfully written to ${absoluteFilePath}`;
  } catch (error) {
    console.error(chalk.red(`[writeLocalFileContent Error] Failed to write file "${filePath}":`), stripAnsi(error.message));
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, `Failed to write file: ${stripAnsi(error.message)}`);
  }
}

function listLocalFiles (directoryPath, recursive = false, projectRoot, ignorePatterns = ['node_modules', '.git', '.DS_Store']) {
  const resolvedPathToList = path.resolve(projectRoot, directoryPath);
  if (!resolvedPathToList.startsWith(path.resolve(projectRoot))) {
    throw new Error(`Access denied: Directory path "${directoryPath}" is outside the allowed project root "${projectRoot}".`);
  }
  if (!fs.existsSync(resolvedPathToList) || !fs.lstatSync(resolvedPathToList).isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedPathToList}`);
  }
  const filesOutput = [];
  const items = fs.readdirSync(resolvedPathToList, { withFileTypes: true });
  for (const item of items) {
    const itemName = item.name;
    if (ignorePatterns.includes(itemName)) continue;
    const itemRelativePath = path.join(directoryPath, itemName);
    const fullItemPath = path.join(resolvedPathToList, itemName);

    if (item.isDirectory()) {
      filesOutput.push({ name: itemName, type: 'directory', path: itemRelativePath.replace(/\\/g, '/') });
      if (recursive) {
        const subFiles = listLocalFiles(itemRelativePath, true, projectRoot, ignorePatterns);
        filesOutput.push(...subFiles.map(sf => ({ ...sf, path: path.join(itemName, sf.path).replace(/\\/g, '/') })));
      }
    } else {
      filesOutput.push({ name: itemName, type: 'file', path: itemRelativePath.replace(/\\/g, '/') });
    }
  }
  return filesOutput;
}

function executeGitCommandUtility (gitArgsArray, executionCwd, projectRoot) {
  const commandString = gitArgsArray.join(' ');
  const allowedCommandPatterns = [
    /^status(?: -s)?$/, /^rev-parse --abbrev-ref HEAD$/, /^checkout -b [\w.-]+$/,
    /^checkout [\w.-]+$/, /^add (?:[\w.-/]+|\.)$/, /^commit -m ".+"$/,
    /^push(?: [\w.-]+ [\w.-]+)?$/, /^pull(?: [\w.-]+ [\w.-]+)?$/, /^branch$/,
    /^log(?: -\d+)?(?: --oneline)?(?: --graph)?(?: --decorate)?(?: --all)?$/
  ];

  if (!allowedCommandPatterns.some(pattern => pattern.test(commandString))) {
    const err = new Error(`Command "git ${commandString}" is not allowed.`);
    throw err;
  }

  const absoluteExecutionCwd = path.resolve(projectRoot, executionCwd);
  if (!absoluteExecutionCwd.startsWith(path.resolve(projectRoot))) {
    throw new Error(`Git command CWD "${executionCwd}" (resolves to "${absoluteExecutionCwd}") is outside allowed project root "${projectRoot}".`);
  }
  if (!fs.existsSync(absoluteExecutionCwd) || !fs.lstatSync(absoluteExecutionCwd).isDirectory()) {
    throw new Error(`Git command CWD "${absoluteExecutionCwd}" is not a valid directory.`);
  }
  return execSync(`git ${commandString}`, { cwd: absoluteExecutionCwd, encoding: 'utf8' });
}

/**
 * Create directory and parent directories if needed
 * @param {string} dirPath - Directory path to create
 * @param {string} projectRoot - Root directory to validate against
 * @returns {Object} - Success message
 */
function createDirectory (dirPath, projectRoot) {
  if (!dirPath) {
    throw new McpError(ErrorCode.InvalidParams, 'Directory path is required');
  }

  const absolutePath = path.isAbsolute(dirPath)
    ? dirPath
    : path.resolve(projectRoot, dirPath);

  // Validate the path is within project root
  if (!absolutePath.startsWith(projectRoot)) {
    throw new McpError(ErrorCode.PermissionDenied, 'Cannot create directory outside project root');
  }

  try {
    fs.ensureDirSync(absolutePath);
    return {
      success: true,
      path: absolutePath,
      relativePath: path.relative(projectRoot, absolutePath),
      message: `Directory created: ${path.relative(projectRoot, absolutePath)}`
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to create directory: ${error.message}`);
  }
}

/**
 * Create empty file (touch)
 * @param {string} filePath - File path to create
 * @param {string} projectRoot - Root directory to validate against
 * @returns {Object} - Success message
 */
function touchFile (filePath, projectRoot) {
  if (!filePath) {
    throw new McpError(ErrorCode.InvalidParams, 'File path is required');
  }

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath);

  // Validate the path is within project root
  if (!absolutePath.startsWith(projectRoot)) {
    throw new McpError(ErrorCode.PermissionDenied, 'Cannot create file outside project root');
  }

  try {
    // First ensure the directory exists
    const dirPath = path.dirname(absolutePath);
    fs.ensureDirSync(dirPath);

    // Create or update the file's timestamp (equivalent to Unix touch)
    const fileExists = fs.existsSync(absolutePath);

    if (fileExists) {
      // Update the file's access and modification times
      const now = new Date();
      fs.utimesSync(absolutePath, now, now);
    } else {
      // Create an empty file
      fs.writeFileSync(absolutePath, '', 'utf8');
    }

    return {
      success: true,
      path: absolutePath,
      relativePath: path.relative(projectRoot, absolutePath),
      message: fileExists
        ? `Updated timestamp: ${path.relative(projectRoot, absolutePath)}`
        : `Created file: ${path.relative(projectRoot, absolutePath)}`
    };
  } catch (error) {
    throw new McpError(ErrorCode.InternalError, `Failed to touch file: ${error.message}`);
  }
}

/**
 * Enhanced version of listLocalFiles that adds a hint for LLM
 * @param {string} directoryPath - Directory to list
 * @param {boolean} recursive - Whether to list recursively
 * @param {string} projectRoot - Root directory to validate against
 * @param {Array<string>} ignore - Patterns to ignore
 * @returns {Object} - List of files with LLM hint
 */
function enhanceListResults (originalResults, projectRoot) {
  // Add the LLM hint to the original results
  return {
    ...originalResults,
    llmHint: `You can browse other directories using 'list_local_files' or create/modify files using 'mkdir', 'touch', or 'write_local_file_content'. The current root directory is ${projectRoot}.`
  };
}

// --- Express App Setup ---
const app = express();
app.use(cors());
app.use(express.json());

const mcpAuthMiddleware = (req, res, next) => {
  if (req.path === '/status' && req.method === 'GET') return next();
  if (!currentApiKey) { // currentApiKey is for authenticating TO this local agent's HTTP server
    console.warn(chalk.yellow("[HTTP MCP] Warning: API key not configured for server. MCP endpoints protected."));
    return res.status(503).json({ error: 'Server not configured with API key.' });
  }
  const apiKeyHeader = req.headers['x-devflow-api-key'];
  if (!apiKeyHeader || apiKeyHeader !== currentApiKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key for Local Agent.' });
  }
  next();
};
app.use(mcpAuthMiddleware);

app.post('/mcp/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const args = req.body || {};
  console.log(chalk.cyan(`[HTTP MCP] Received request for tool: ${toolName} with args:`), args);

  if (toolName.startsWith('remote_')) {
    const config = readConfig();
    const supabaseUrl = config.supabaseUrl;
    const remoteApiKey = config.devflowApiKeyRemote; // Key for authenticating TO Supabase Gateway

    if (!supabaseUrl || !remoteApiKey) {
      console.error(chalk.red(`[HTTP MCP] Remote tool "${toolName}" called, but agent not configured for remote access.`));
      return res.status(503).json({ error: `Local agent not configured for remote access. Missing supabaseUrl or devflowApiKeyRemote in config. Run 'devflow-local-agent configure'.` });
    }

    const actualToolName = toolName.substring('remote_'.length);
    const mcpGatewayUrl = `${supabaseUrl}/functions/v1/mcp-gateway`;
    const payload = { tool_name: actualToolName, arguments: args };

    try {
      console.log(chalk.blue(`[HTTP MCP] Proxying remote tool call "${actualToolName}" to ${mcpGatewayUrl}`));
      const response = await fetch(mcpGatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-DevFlow-API-Key': remoteApiKey },
        body: JSON.stringify(payload)
      });

      let responseBody;
      try {
        responseBody = await response.json();
      } catch (e) {
        const textBody = await response.text();
        console.error(chalk.red(`[HTTP MCP] Failed to parse JSON response from remote gateway for tool "${actualToolName}". Status: ${response.status}. Body: ${textBody}`));
        if (!response.ok) {
          return res.status(response.status || 502).json({ error: `Remote tool "${actualToolName}" failed with status ${response.status}. Response: ${textBody}` });
        }
        console.warn(chalk.yellow(`[HTTP MCP] Remote gateway response for "${actualToolName}" was OK but not valid JSON, returning as text.`));
        return res.status(200).json({ result: textBody });
      }

      if (!response.ok) {
        console.error(chalk.red(`[HTTP MCP] Error from remote gateway for tool "${actualToolName}": ${response.status}`), responseBody);
        const errorMessage = responseBody?.error || `Remote gateway returned status ${response.status}`;
        return res.status(response.status || 502).json({ error: `Remote tool "${actualToolName}" failed: ${errorMessage}` });
      }

      if (typeof responseBody.result === 'undefined') {
        console.warn(chalk.yellow(`[HTTP MCP] Remote gateway response for "${actualToolName}" missing 'result' field. Returning raw response.`), responseBody);
        return res.status(200).json(responseBody);
      }
      console.log(chalk.green(`[HTTP MCP] Successfully proxied remote tool call "${actualToolName}".`));
      return res.status(200).json({ result: responseBody.result });
    } catch (error) {
      console.error(chalk.red(`[HTTP MCP] Network error calling remote tool "${actualToolName}":`), error);
      return res.status(502).json({ error: `Failed to call remote tool "${actualToolName}": ${error.message}` });
    }
  } else { // Handle Local Tool Calls
    try {
      let result;
      switch (toolName) {
        case 'get_local_file_content':
          if (!args.filePath) return res.status(400).json({ error: 'Missing required argument: filePath' });
          result = getFileContent(args.filePath, currentProjectRoot);
          break;
        case 'write_local_file_content':
          if (!args.filePath) return res.status(400).json({ error: 'Missing required argument: filePath' });
          if (typeof args.content !== 'string') return res.status(400).json({ error: 'Missing or invalid required argument: content (must be a string)' });
          result = writeLocalFileContent(args.filePath, args.content, currentProjectRoot);
          break;
        case 'list_local_files':
          if (!args.directoryPath) return res.status(400).json({ error: 'Missing required argument: directoryPath' });
          result = listLocalFiles(args.directoryPath, args.recursive, currentProjectRoot, args.ignore);
          break;
        case 'execute_git_command':
          if (!args.command_args || !Array.isArray(args.command_args)) return res.status(400).json({ error: 'Missing or invalid required argument: command_args (must be an array)' });
          result = { output: executeGitCommandUtility(args.command_args, currentProjectRoot, currentProjectRoot).trim() };
          break;
        default:
          return res.status(404).json({ error: `Tool "${toolName}" not found.` });
      }
      res.status(200).json({ result });
    } catch (error) {
      console.error(chalk.red(`[HTTP MCP] Error executing local tool ${toolName}:`), stripAnsi(error.message));
      let statusCode = 500;
      if (error.message.includes('not found')) statusCode = 404;
      if (error.message.includes('Access denied')) statusCode = 403;
      res.status(statusCode).json({ error: stripAnsi(error.message) });
    }
  }
});

app.get('/status', (req, res) => {
  res.json({
    status: 'active', timestamp: new Date().toISOString(),
    message: "DevFlow AI Local Agent MCP Server is active.",
    projectRoot: currentProjectRoot, port: PORT
  });
});

// --- Commander CLI Setup ---
const savedConfig = readConfig();

program
  .version(packageJson.version)
  .description('Local agent CLI for DevFlow AI.')
  .option('-p, --port <port_number>', 'Port for the MCP server', process.env.DEVFLOW_LOCAL_AGENT_PORT || savedConfig.port || DEFAULT_PORT.toString())
  .option('-k, --api-key <key>', 'API key for authenticating clients TO this Local Agent', process.env.DEVFLOW_LOCAL_AGENT_API_KEY || savedConfig.apiKey)
  .option('-r, --root <path>', 'Project root directory for local operations', process.env.DEVFLOW_LOCAL_AGENT_PROJECT_ROOT || savedConfig.root || INITIAL_CWD);

const startServerAction = (options) => {
  const globalOpts = program.opts();
  PORT = parseInt(options.port || globalOpts.port, 10);
  currentApiKey = options.apiKey || globalOpts.apiKey; // Key for this agent's HTTP server
  currentProjectRoot = path.resolve(options.root || globalOpts.root);

  if (isNaN(PORT)) { console.error(chalk.red('Error: Invalid port number.')); process.exit(1); }
  if (!currentApiKey) { console.error(chalk.red('Error: API Key for this Local Agent is required. Use --api-key, DEVFLOW_LOCAL_AGENT_API_KEY, or configure.')); process.exit(1); }
  try {
    if (!fs.existsSync(currentProjectRoot) || !fs.lstatSync(currentProjectRoot).isDirectory()) {
      console.error(chalk.red(`Error: Project root "${currentProjectRoot}" is not a valid directory.`)); process.exit(1);
    }
  } catch (error) { console.error(chalk.red(`Error with project root "${currentProjectRoot}":`), error.message); process.exit(1); }

  console.log(chalk.blue(`Project root set to: ${currentProjectRoot}`));
  app.listen(PORT, () => {
    console.log(chalk.green.bold(`DevFlow AI Local Agent MCP HTTP Server started on http://localhost:${PORT}`));
    console.log(chalk.blue('Local Agent API Key Loaded. MCP Endpoints require X-DevFlow-API-Key header.'));
    const remoteConfig = readConfig();
    if (remoteConfig.supabaseUrl && remoteConfig.devflowApiKeyRemote) {
      console.log(chalk.blue('Remote Supabase Gateway access is configured.'));
    } else {
      console.log(chalk.yellow('Remote Supabase Gateway access is NOT configured. Proxy tools (remote_*) will not work. Run "devflow-local-agent configure".'));
    }
  });
};

program
  .command('start-server', { isDefault: true })
  .description('Starts the Local Agent MCP HTTP server (default command).')
  .action(startServerAction);

program.command('hello').action(() => console.log(chalk.magenta.bold('Hello from DevFlow AI Local Agent!')));

program
  .command('configure')
  .description('Configure Local Agent settings, including remote Supabase Gateway access.')
  .action(async () => {
    const currentConfig = readConfig();
    console.log(chalk.blue('Current configuration:'), currentConfig);
    const questions = [
      {
        type: 'password', name: 'apiKey',
        message: 'Enter API Key for authenticating clients *to* this Local Agent:',
        default: currentConfig.apiKey, mask: '*',
        validate: v => (v && v.length) ? true : 'Local Agent API Key cannot be empty.'
      },
      {
        type: 'input', name: 'port',
        message: 'Enter default port for this Local Agent MCP server:',
        default: currentConfig.port || DEFAULT_PORT.toString(),
        validate: v => { const p = parseInt(v, 10); return (!isNaN(p) && p > 0 && p < 65536) ? true : 'Please enter a valid port number (1-65535).'; }
      },
      {
        type: 'input', name: 'root',
        message: 'Enter default project root path for local operations (absolute path, leave empty for CWD):',
        default: currentConfig.root || ''
      },
      {
        type: 'input', name: 'supabaseUrl',
        message: 'Enter Supabase instance URL (for remote tools, e.g., http://localhost:54321 or https://<ref>.supabase.co):',
        default: currentConfig.supabaseUrl || DEFAULT_SUPABASE_URL,
        validate: v => (v && v.startsWith('http')) ? true : 'Please enter a valid URL starting with http:// or https://.'
      },
      // {
      //   type: 'password', name: 'devflowApiKeyRemote',
      //   message: 'Enter DevFlow API Key (from web UI) for authenticating *to* the Supabase MCP Gateway (for remote tools):',
      //   default: currentConfig.devflowApiKeyRemote, mask: '*',
      //   validate: v => true // Allow empty
      // },
    ];
    try {
      const answers = await inquirer.prompt(questions);
      const newConfig = {
        apiKey: answers.apiKey,
        port: parseInt(answers.port, 10),
        root: answers.root.trim() === '' ? undefined : path.resolve(answers.root.trim()),
        supabaseUrl: answers.supabaseUrl.trim(),
        devflowApiKeyRemote: answers.apiKey, // Use the same API key for remote access
      };
      if (!newConfig.root) delete newConfig.root;
      // Ensure devflowApiKeyRemote is handled correctly if apiKey is empty (though validated)
      if (!newConfig.devflowApiKeyRemote) {
        delete newConfig.devflowApiKeyRemote;
      }

      if (newConfig.supabaseUrl === '') {
        delete newConfig.supabaseUrl;
      } else if (!newConfig.supabaseUrl) {
        delete newConfig.supabaseUrl;
      }

      writeConfig(newConfig);
    } catch (error) { console.error(chalk.red('Failed to save configuration:'), error.message); }
  });

// --- Stdio MCP Server Setup ---
const startStdioMcpServerAction = async () => {
  // Ensure only one instance is running
  if (checkAgentRunning()) {
    const lockInfo = getLockInfo();
    console.error(chalk.red(`DevFlow Agent is already running (PID: ${lockInfo.pid}, Mode: ${lockInfo.mode})`));
    console.error(chalk.yellow('Use `devflow-local-agent stop` to stop the running agent first.'));
    process.exit(1);
  }
  const hostApiKey = process.env.DEVFLOW_API_KEY;
  const maxRoot = process.env.DEVFLOW_MAX_ROOT ? path.resolve(process.env.DEVFLOW_MAX_ROOT) : null;

  if (!hostApiKey) { console.error(chalk.red('Error: DEVFLOW_API_KEY env var is required for stdio MCP mode.')); process.exit(1); }
  if (maxRoot && (!fs.existsSync(maxRoot) || !fs.lstatSync(maxRoot).isDirectory())) {
    console.error(chalk.red(`Error: DEVFLOW_MAX_ROOT "${maxRoot}" is not a valid directory.`)); process.exit(1);
  }

  const mcpServer = new McpServer({ name: 'devflow-local-agent-mcp', version: packageJson.version }, { capabilities: { tools: {} } });

  const localTools = [
    {
      name: 'get_local_file_content',
      description: 'Reads the content of a file from the local filesystem, relative to a specified project root.',
      inputSchema: {
        type: 'object',
        properties: {
          projectRoot: { type: 'string', description: 'Absolute path to the project root directory.' },
          filePath: { type: 'string', description: 'Path to the file, relative to projectRoot.' },
        },
        required: ['projectRoot', 'filePath'],
      },
    },
    {
      name: 'write_local_file_content',
      description: 'Writes content to a file on the local filesystem, relative to a specified project root.',
      inputSchema: {
        type: 'object',
        properties: {
          projectRoot: { type: 'string', description: 'Absolute path to the project root directory.' },
          filePath: { type: 'string', description: 'Path to the file, relative to projectRoot.' },
          content: { type: 'string', description: 'The content to write to the file.' },
        },
        required: ['projectRoot', 'filePath', 'content'],
      },
    },
    {
      name: 'list_local_files',
      description: 'Lists files and directories within a path, relative to a specified project root.',
      inputSchema: {
        type: 'object',
        properties: {
          projectRoot: { type: 'string', description: 'Absolute path to the project root directory.' },
          directoryPath: { type: 'string', description: 'Path to the directory to list, relative to projectRoot.' },
          recursive: { type: 'boolean', default: false, description: 'Whether to list files recursively.' },
          ignore: { type: 'array', items: { type: 'string' }, description: 'Array of patterns to ignore.' },
        },
        required: ['projectRoot', 'directoryPath'],
      },
    },
    {
      name: 'execute_git_command',
      description: 'Executes a Git command within a specified execution CWD, sandboxed by a project root.',
      inputSchema: {
        type: 'object',
        properties: {
          projectRoot: { type: 'string', description: 'Absolute path to the overall project root (sandbox).' },
          executionCwd: { type: 'string', default: '.', description: 'Path where the git command should execute, relative to projectRoot.' },
          command_args: { type: 'array', items: { type: 'string' }, description: 'Array of arguments for the git command (e.g., ["status"]).' },
        },
        required: ['projectRoot', 'command_args'],
      },
    },
    { name: 'mkdir', description: 'Creates a directory and any necessary parent directories' },
    { name: 'touch', description: 'Creates a new empty file or updates the timestamp of an existing file' }
  ];
  const remoteTools = [
    {
      name: 'remote_list_projects',
      description: 'Lists projects from the DevFlow AI backend.',
      inputSchema: {
        type: 'object',
        properties: {
          github_org_id: { type: ['integer', 'null'], description: 'Optional GitHub organization ID to filter projects.' }
        },
        required: [],
      },
    },
    {
      name: 'remote_get_project_details',
      description: 'Gets details for a specific project from the DevFlow AI backend.',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid', description: 'The UUID of the project.' }
        },
        required: ['project_id'],
      },
    },
    {
      name: 'remote_list_tasks',
      description: 'Lists tasks for a specific project from the DevFlow AI backend.',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid', description: 'The UUID of the project.' },
          status_filter: { type: 'array', items: { type: 'string' }, description: 'Optional array of statuses to filter tasks by.' },
          scoped_path_id: { type: ['integer', 'null'], description: 'Optional scoped path ID to filter tasks by.' }
        },
        required: ['project_id'],
      },
    },
    {
      name: 'remote_get_task_details',
      description: 'Gets details for a specific task from the DevFlow AI backend.',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid', description: 'The UUID of the task.' }
        },
        required: ['task_id'],
      },
    },
    {
      name: 'remote_create_project',
      description: 'Creates a new project in the DevFlow AI backend.',
      inputSchema: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Name of the new project.' },
          githubRepoURL: { type: ['string', 'null'], description: 'Optional URL of the associated GitHub repository.' },
          description: { type: ['string', 'null'], description: 'Optional project description.' },
          guidelines: { type: ['string', 'null'], description: 'Optional project guidelines text.' },
          github_org_id: { type: ['integer', 'null'], description: 'Optional GitHub organization ID.' },
          github_org_login: { type: ['string', 'null'], description: 'Optional GitHub organization login name.' }
        },
        required: ['projectName'],
      },
    },
    {
      name: 'remote_create_task',
      description: 'Creates a new task within a project in the DevFlow AI backend.',
      inputSchema: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid', description: 'The UUID of the project.' },
          title: { type: 'string', description: 'Title of the new task.' },
          description: { type: ['string', 'null'], description: 'Optional task description.' },
          scoped_path_id: { type: ['integer', 'null'], description: 'Optional scoped path ID to associate.' },
          status: { type: 'string', enum: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'], default: 'Backlog', description: 'Initial status of the task.' }
        },
        required: ['project_id', 'title'],
      },
    },
    {
      name: 'remote_update_task_status',
      description: 'Updates the status of a task in the DevFlow AI backend.',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid', description: 'The UUID of the task.' },
          new_status: { type: 'string', enum: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'], description: 'The new status for the task.' },
          current_branch: { type: ['string', 'null'], description: 'Optional associated git branch name.' },
          pull_request_url: { type: ['string', 'null'], description: 'Optional URL of the associated pull request.' }
        },
        required: ['task_id', 'new_status'],
      },
    },
    {
      name: 'remote_add_comment_to_task',
      description: 'Adds a comment to a task in the DevFlow AI backend.',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string', format: 'uuid', description: 'The UUID of the task.' },
          comment_text: { type: 'string', description: 'The text content of the comment.' },
          author_display_name: { type: ['string', 'null'], description: 'Optional display name for the author (e.g., AI Assistant).' }
        },
        required: ['task_id', 'comment_text'],
      },
    },
  ];

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...localTools, ...remoteTools] }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name.startsWith('remote_')) {
      const config = readConfig();
      const supabaseUrl = config.supabaseUrl;
      const remoteApiKeyForGateway = config.devflowApiKeyRemote;
      if (!supabaseUrl || !remoteApiKeyForGateway) throw new McpError(ErrorCode.ConfigurationError, `Local agent not configured for remote access. Run 'devflow-local-agent configure'.`);

      const actualToolName = name.substring('remote_'.length);
      const mcpGatewayUrl = `${supabaseUrl}/functions/v1/mcp-gateway`;
      const payload = { tool_name: actualToolName, arguments: args || {} };

      try {
        console.error(chalk.blue(`[MCP Stdio] Proxying remote tool call "${actualToolName}" to ${mcpGatewayUrl}`));
        const response = await fetch(mcpGatewayUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-DevFlow-API-Key': remoteApiKeyForGateway },
          body: JSON.stringify(payload)
        });

        let responseBody;
        try { responseBody = await response.json(); } catch (e) { responseBody = await response.text(); }

        if (!response.ok) {
          const errMsg = (typeof responseBody === 'object' && responseBody?.error) ? responseBody.error : (responseBody || `Remote gateway returned status ${response.status}`);
          throw new McpError(ErrorCode.InternalError, `Remote tool "${actualToolName}" failed: ${errMsg}`);
        }
        if (typeof responseBody.result === 'undefined') {
          return { content: [{ type: 'text', text: JSON.stringify(responseBody) }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify(responseBody.result) }] };
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(ErrorCode.NetworkError, `Failed to call remote tool "${actualToolName}": ${error.message}`);
      }
    } else { // Local tools
      if (!args || typeof args !== 'object' || !args.projectRoot || typeof args.projectRoot !== 'string') {
        if (localTools.some(lt => lt.name === name)) throw new McpError(ErrorCode.InvalidParams, `Local tool "${name}" requires "projectRoot" argument in Stdio mode.`);
      }
      const callProjectRoot = args.projectRoot ? path.resolve(args.projectRoot) : null;
      if (callProjectRoot) {
        if (!path.isAbsolute(callProjectRoot)) throw new McpError(ErrorCode.InvalidParams, `"projectRoot" must be absolute.`);
        if (maxRoot && !callProjectRoot.startsWith(maxRoot)) throw new McpError(ErrorCode.PermissionDenied, `projectRoot outside DEVFLOW_MAX_ROOT.`);
        if (!fs.existsSync(callProjectRoot) || !fs.lstatSync(callProjectRoot).isDirectory()) throw new McpError(ErrorCode.InvalidParams, `projectRoot not a valid directory.`);
      } else if (localTools.some(lt => lt.name === name)) {
        throw new McpError(ErrorCode.InvalidParams, `Local tool "${name}" requires "projectRoot" argument, but it was not provided or was invalid.`);
      }

      try {
        let result;
        switch (name) {
          case 'get_local_file_content': result = getFileContent(args.filePath, callProjectRoot); break;
          case 'write_local_file_content': result = writeLocalFileContent(args.filePath, args.content, callProjectRoot); break;
          case 'execute_git_command': result = { output: executeGitCommandUtility(args.command_args, args.executionCwd || '.', callProjectRoot).trim() }; break;
          case 'list_local_files':
            const listResults = listLocalFiles(args.directoryPath, args.recursive, callProjectRoot, args.ignore);
            result = enhanceListResults(listResults, callProjectRoot);
            break;
          case 'mkdir':
            result = createDirectory(args.dirPath, callProjectRoot);
            break;
          case 'touch':
            result = touchFile(args.filePath, callProjectRoot);
            break;
          default: throw new McpError(ErrorCode.MethodNotFound, `Tool "${name}" not found.`);
        }
        return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] };
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(ErrorCode.InternalError, stripAnsi(error.message));
      }
    }
  });

  mcpServer.onerror = (error) => { console.error(chalk.red('[MCP Stdio Unhandled Error]'), error); };
  process.on('SIGINT', async () => { await mcpServer.close(); process.exit(0); });
  process.on('SIGTERM', async () => { await mcpServer.close(); process.exit(0); });

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error(chalk.green.bold('DevFlow AI Local Agent running in Stdio MCP mode.'));
  console.error(chalk.blue(`Host API Key loaded. DEVFLOW_MAX_ROOT: ${maxRoot || 'Not set'}`));
};

program
  .command('mcp-stdio')
  .description('Starts the Local Agent in Stdio MCP mode for integration with MCP hosts.')
  .action(startStdioMcpServerAction);

// Removed the 'find-empty-projects' command as its functionality is now part of the MCP tools.

program.parse(process.argv);
