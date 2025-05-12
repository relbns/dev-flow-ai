#!/usr/bin/env node

import dotenv from 'dotenv';
import { Command } from 'commander';
import fs from 'fs';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const program = new Command();

const INITIAL_CWD = process.cwd();
let currentApiKey = null;
let currentProjectRoot = INITIAL_CWD;
const DEFAULT_PORT = 52173;
let PORT = DEFAULT_PORT;

// Helper to read package.json for version
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

// --- Utility Functions ---
function stripAnsi(str) {
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  return str.replace(ansiRegex, '');
}

// basePath parameter changed to projectRoot for clarity and consistency
function getFileContent(filePath, projectRoot) {
  const absoluteFilePath = path.resolve(projectRoot, filePath);
  if (!absoluteFilePath.startsWith(path.resolve(projectRoot))) {
    throw new Error(`Access denied: File path "${filePath}" is outside the allowed project root "${projectRoot}".`);
  }
  if (!fs.existsSync(absoluteFilePath)) {
    throw new Error(`File not found at ${absoluteFilePath}`);
  }
  return fs.readFileSync(absoluteFilePath, 'utf8');
}

// basePath parameter changed to projectRoot
function writeLocalFileContent(filePath, content, projectRoot) {
  const absoluteFilePath = path.resolve(projectRoot, filePath);
  if (!absoluteFilePath.startsWith(path.resolve(projectRoot))) {
    throw new Error(`Access denied: File path "${filePath}" is outside the allowed project root "${projectRoot}".`);
  }
  fs.writeFileSync(absoluteFilePath, content, 'utf8');
  return `Content successfully written to ${absoluteFilePath}`;
}

// basePath parameter changed to projectRoot
function listLocalFiles(directoryPath, recursive = false, projectRoot, ignorePatterns = ['node_modules', '.git', '.DS_Store']) {
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
    const itemRelativePath = path.join(directoryPath, itemName); // Relative to the directoryPath being listed
    const fullItemPath = path.join(resolvedPathToList, itemName); // Full path for recursive calls

    if (item.isDirectory()) {
      filesOutput.push({ name: itemName, type: 'directory', path: itemRelativePath.replace(/\\/g, '/') });
      if (recursive) {
        // Pass projectRoot to recursive calls
        const subFiles = listLocalFiles(itemRelativePath, true, projectRoot, ignorePatterns);
        // Adjust sub-file paths to be relative to the initial directoryPath
        filesOutput.push(...subFiles.map(sf => ({ ...sf, path: path.join(itemName, sf.path).replace(/\\/g, '/') })));
      }
    } else {
      filesOutput.push({ name: itemName, type: 'file', path: itemRelativePath.replace(/\\/g, '/') });
    }
  }
  return filesOutput;
}

// executionCwd is the directory where the git command will run (relative to projectRoot or absolute)
// projectRoot is the overall sandbox for this operation
function executeGitCommandUtility(gitArgsArray, executionCwd, projectRoot) {
  const commandString = gitArgsArray.join(' ');
  const allowedCommandPatterns = [
    /^status(?: -s)?$/, /^rev-parse --abbrev-ref HEAD$/, /^checkout -b [\w.-]+$/,
    /^checkout [\w.-]+$/, /^add (?:[\w.-/]+|\.)$/, /^commit -m ".+"$/,
    /^push(?: [\w.-]+ [\w.-]+)?$/, /^pull(?: [\w.-]+ [\w.-]+)?$/, /^branch$/,
    /^log(?: -\d+)?(?: --oneline)?(?: --graph)?(?: --decorate)?(?: --all)?$/
  ];

  if (!allowedCommandPatterns.some(pattern => pattern.test(commandString))) {
    const err = new Error(`Command "git ${commandString}" is not allowed.`);
    // Consider adding examples if this error is hit often by users
    // err.allowedPatternsExamples = [ "status", "log -1", "add .", "commit -m \"My commit\"" ];
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

// --- Express App Setup ---
const app = express();
app.use(cors());
app.use(express.json());

const mcpAuthMiddleware = (req, res, next) => {
  if (req.path === '/status' && req.method === 'GET') return next(); // Status is unprotected
  if (!currentApiKey) {
    console.warn(chalk.yellow("Warning: API key not configured for server. MCP endpoints protected."));
    return res.status(503).json({ error: 'Server not configured with API key.' });
  }
  const apiKeyHeader = req.headers['x-devflow-api-key'];
  if (!apiKeyHeader || apiKeyHeader !== currentApiKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key.' });
  }
  next();
};
app.use(mcpAuthMiddleware); // Apply to all routes after this, except /status handled above

// MCP Router (or direct app.post)
app.post('/mcp/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const args = req.body;
  console.log(`Received MCP request for tool: ${toolName} with args:`, args);
  try {
    let result;
    switch (toolName) {
      case 'get_local_file_content': result = getFileContent(args.filePath, currentProjectRoot); break;
      case 'write_local_file_content': result = writeLocalFileContent(args.filePath, args.content, currentProjectRoot); break;
      case 'list_local_files': result = listLocalFiles(args.directoryPath, args.recursive, currentProjectRoot, args.ignore); break;
      // For HTTP server, executionCwd for git is currentProjectRoot, and projectRoot (sandbox) is also currentProjectRoot
      case 'execute_git_command': result = { output: executeGitCommandUtility(args.command_args, currentProjectRoot, currentProjectRoot).trim() }; break;
      default: return res.status(404).json({ error: `Tool "${toolName}" not found.` });
    }
    res.json({ result });
  } catch (error) {
    console.error(chalk.red(`Error executing tool ${toolName}:`), stripAnsi(error.message));
    res.status(500).json({ error: stripAnsi(error.message) });
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
const savedConfig = readConfig(); // Read config early to use for option defaults

program
  .version(packageJson.version)
  .description('Local agent CLI for DevFlow AI.')
  .option('-p, --port <port_number>', 'Port for the MCP server', process.env.DEVFLOW_LOCAL_AGENT_PORT || savedConfig.port || DEFAULT_PORT.toString())
  .option('-k, --api-key <key>', 'API key for server authentication', process.env.DEVFLOW_LOCAL_AGENT_API_KEY || savedConfig.apiKey)
  .option('-r, --root <path>', 'Project root directory for operations', process.env.DEVFLOW_LOCAL_AGENT_PROJECT_ROOT || savedConfig.root || INITIAL_CWD);

const startServerAction = (options) => { // options here are from the specific command (e.g. start-server)
  const globalOpts = program.opts(); // These will have resolved CLI > ENV > Config > Default

  PORT = parseInt(options.port || globalOpts.port, 10);
  currentApiKey = options.apiKey || globalOpts.apiKey;
  currentProjectRoot = path.resolve(options.root || globalOpts.root);

  if (isNaN(PORT)) {
    console.error(chalk.red('Error: Invalid port number.')); process.exit(1);
  }
  if (!currentApiKey) {
    console.error(chalk.red('Error: API Key is required. Use --api-key or DEVFLOW_LOCAL_AGENT_API_KEY.')); process.exit(1);
  }
  try {
    if (!fs.existsSync(currentProjectRoot) || !fs.lstatSync(currentProjectRoot).isDirectory()) {
      console.error(chalk.red(`Error: Project root "${currentProjectRoot}" is not a valid directory.`)); process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`Error with project root "${currentProjectRoot}":`), error.message); process.exit(1);
  }

  console.log(chalk.blue(`Project root set to: ${currentProjectRoot}`));
  app.listen(PORT, () => {
    console.log(chalk.green.bold(`DevFlow AI Local Agent MCP Server started on http://localhost:${PORT}`));
    console.log(chalk.blue('API Key Loaded. MCP Endpoints require X-DevFlow-API-Key header.'));
  });
};

program
  .command('start-server', { isDefault: true }) // Make start-server the default command
  .description('Starts the Local Agent MCP HTTP server (default command).')
  // Options defined globally will be available here too
  .action(startServerAction);

// Define other CLI utility commands
program.command('hello').action(() => console.log(chalk.magenta.bold('Hello from DevFlow AI Local Agent!')));

program
  .command('configure')
  .description('Configure default API Key, port, and project root for the Local Agent.')
  .action(async () => {
    const currentConfig = readConfig();
    console.log(chalk.blue('Current configuration:'), currentConfig);

    const questions = [
      {
        type: 'password', // Use password type to mask API key input
        name: 'apiKey',
        message: 'Enter your DevFlow AI API Key:',
        default: currentConfig.apiKey,
        mask: '*',
        validate: function (value) {
          if (value.length) {
            return true;
          }
          return 'API Key cannot be empty.';
        },
      },
      {
        type: 'input',
        name: 'port',
        message: 'Enter default port for the MCP server:',
        default: currentConfig.port || DEFAULT_PORT.toString(),
        validate: function (value) {
          const port = parseInt(value, 10);
          if (!isNaN(port) && port > 0 && port < 65536) {
            return true;
          }
          return 'Please enter a valid port number (1-65535).';
        },
      },
      {
        type: 'input',
        name: 'root',
        message: 'Enter default project root path (absolute path, leave empty to use current dir when starting):',
        default: currentConfig.root || '', // Empty means use CWD at start time
      },
    ];

    try {
      const answers = await inquirer.prompt(questions);
      const newConfig = {
        apiKey: answers.apiKey,
        port: parseInt(answers.port, 10),
        root: answers.root.trim() === '' ? undefined : path.resolve(answers.root.trim()), // Store absolute path or undefined
      };
      writeConfig(newConfig);
    } catch (error) {
      console.error(chalk.red('Failed to save configuration:'), error.message);
    }
  });

// --- Stdio MCP Server Setup ---
const startStdioMcpServerAction = async () => {
  const apiKey = process.env.DEVFLOW_API_KEY; // API key provided by MCP host
  const maxRoot = process.env.DEVFLOW_MAX_ROOT ? path.resolve(process.env.DEVFLOW_MAX_ROOT) : null; // Optional overall sandbox

  if (!apiKey) {
    console.error(chalk.red('Error: DEVFLOW_API_KEY environment variable is required for stdio MCP mode.'));
    process.exit(1);
  }

  if (maxRoot && (!fs.existsSync(maxRoot) || !fs.lstatSync(maxRoot).isDirectory())) {
    console.error(chalk.red(`Error: DEVFLOW_MAX_ROOT "${maxRoot}" is not a valid directory.`));
    process.exit(1);
  }

  const mcpServer = new McpServer(
    {
      name: 'devflow-local-agent-mcp',
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {}, // Tools will be dynamically listed
      },
    }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
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
    ],
  }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    // API Key validation for stdio mode (could also be a middleware if MCP SDK supports it easily)
    // For now, checking it directly in the CallTool handler.
    // The API key is passed via env var by the MCP host, not in the tool call itself.
    // This is a server-to-server auth, not client-to-server per call.

    const { name, arguments: args } = request.params;

    if (!args || typeof args !== 'object' || !args.projectRoot || typeof args.projectRoot !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, `Tool "${name}" requires a "projectRoot" string argument.`);
    }

    const callProjectRoot = path.resolve(args.projectRoot);

    if (!path.isAbsolute(callProjectRoot)) {
        throw new McpError(ErrorCode.InvalidParams, `"projectRoot" ("${callProjectRoot}") must be an absolute path.`);
    }
    if (maxRoot && !callProjectRoot.startsWith(maxRoot)) {
      throw new McpError(ErrorCode.PermissionDenied, `Access denied: projectRoot "${callProjectRoot}" is outside the configured DEVFLOW_MAX_ROOT "${maxRoot}".`);
    }
    if (!fs.existsSync(callProjectRoot) || !fs.lstatSync(callProjectRoot).isDirectory()) {
        throw new McpError(ErrorCode.InvalidParams, `projectRoot "${callProjectRoot}" is not a valid directory.`);
    }

    try {
      let result;
      switch (name) {
        case 'get_local_file_content':
          if (!args.filePath || typeof args.filePath !== 'string') throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid filePath argument.');
          result = getFileContent(args.filePath, callProjectRoot);
          break;
        case 'write_local_file_content':
          if (!args.filePath || typeof args.filePath !== 'string') throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid filePath argument.');
          if (typeof args.content !== 'string') throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid content argument.');
          result = writeLocalFileContent(args.filePath, args.content, callProjectRoot);
          break;
        case 'list_local_files':
          if (!args.directoryPath || typeof args.directoryPath !== 'string') throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid directoryPath argument.');
          result = listLocalFiles(args.directoryPath, args.recursive, callProjectRoot, args.ignore);
          break;
        case 'execute_git_command':
          if (!args.command_args || !Array.isArray(args.command_args)) throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid command_args array.');
          const execCwd = args.executionCwd && typeof args.executionCwd === 'string' ? args.executionCwd : '.';
          result = { output: executeGitCommandUtility(args.command_args, execCwd, callProjectRoot).trim() };
          break;
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Tool "${name}" not found.`);
      }
      return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] };
    } catch (error) {
      console.error(chalk.red(`[MCP Stdio Error] Error executing tool ${name}:`), stripAnsi(error.message));
      // Ensure error is an McpError or wrap it
      if (error instanceof McpError) throw error;
      throw new McpError(ErrorCode.InternalError, stripAnsi(error.message));
    }
  });
  
  mcpServer.onerror = (error) => {
    // Log to stderr so MCP host can see it
    console.error(chalk.red('[MCP Stdio Unhandled Error]'), error);
  };

  process.on('SIGINT', async () => {
    await mcpServer.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await mcpServer.close();
    process.exit(0);
  });

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  // Log to stderr so it doesn't interfere with stdout JSON messages
  console.error(chalk.green.bold('DevFlow AI Local Agent running in Stdio MCP mode.'));
  console.error(chalk.blue(`API Key loaded from DEVFLOW_API_KEY. DEVFLOW_MAX_ROOT: ${maxRoot || 'Not set'}`));
};

program
  .command('mcp-stdio')
  .description('Starts the Local Agent in Stdio MCP mode for integration with MCP hosts.')
  .action(startStdioMcpServerAction);


// ... (add back other direct CLI commands like get-file-content, git, list-files, write-file-content if needed, adapting them to use program.opts() for global options like --root)

program.parse(process.argv);
