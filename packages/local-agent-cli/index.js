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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const program = new Command();

// Use current working directory as the project root for singleton behavior
const INITIAL_CWD = process.cwd();
let currentApiKey = null;
let currentProjectRoot = INITIAL_CWD; // Always use where the command was run
const DEFAULT_PORT = 52173;

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
    /^status(?: -s)?$/,
    /^rev-parse --abbrev-ref HEAD$/,
    /^checkout -b [\w.-]+$/,
    /^checkout [\w.-]+$/,
    /^add (?:[\w.-/]+|\.)$/,
    /^commit -m ".+"$/,
    /^branch$/,
    /^log(?: -\d+)?(?: --oneline)?(?: --graph)?(?: --decorate)?(?: --all)?$/,
    /^grep(?: -[a-zA-Z0-9]+)* (?:--[a-zA-Z0-9-]+(?: [^\s]+)?)* .+/,
    /^diff(?: --name-only)?(?: --staged)?(?: [^\s]+)*$/,
    /^show(?: [a-f0-9]{7,40})?$/,
    /^ls-files(?: --others)?(?: --modified)?(?: --exclude-standard)?$/,
    /^stash(?: list)?$/,
    /^config(?: --get)? [^\s]+$/,
    /^remote -v$/,
    /^tag$/,
    /^fetch(?: [^\s]+)?$/
  ]

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

function createDirectory (dirPath, projectRoot) {
  if (!dirPath) {
    throw new McpError(ErrorCode.InvalidParams, 'Directory path is required');
  }

  const absolutePath = path.isAbsolute(dirPath)
    ? dirPath
    : path.resolve(projectRoot, dirPath);

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

function touchFile (filePath, projectRoot) {
  if (!filePath) {
    throw new McpError(ErrorCode.InvalidParams, 'File path is required');
  }

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath);

  if (!absolutePath.startsWith(projectRoot)) {
    throw new McpError(ErrorCode.PermissionDenied, 'Cannot create file outside project root');
  }

  try {
    const dirPath = path.dirname(absolutePath);
    fs.ensureDirSync(dirPath);

    const fileExists = fs.existsSync(absolutePath);

    if (fileExists) {
      const now = new Date();
      fs.utimesSync(absolutePath, now, now);
    } else {
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

// --- Express App Setup (HTTP Mode) ---
const app = express();
app.use(cors());
app.use(express.json());

const mcpAuthMiddleware = (req, res, next) => {
  if (req.path === '/status' && req.method === 'GET') return next();
  if (!currentApiKey) {
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

  // Only handle local tools - remove remote tool support for now
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
      case 'mkdir':
        if (!args.dirPath) return res.status(400).json({ error: 'Missing required argument: dirPath' });
        result = createDirectory(args.dirPath, currentProjectRoot);
        break;
      case 'touch':
        if (!args.filePath) return res.status(400).json({ error: 'Missing required argument: filePath' });
        result = touchFile(args.filePath, currentProjectRoot);
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
});

app.get('/status', (req, res) => {
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    message: "DevFlow AI Local Agent MCP Server is active.",
    projectRoot: currentProjectRoot,
    port: process.env.PORT || DEFAULT_PORT
  });
});

// --- Commander CLI Setup ---
const savedConfig = readConfig();

program
  .version(packageJson.version)
  .description('Local agent CLI for DevFlow AI.')
  .option('-p, --port <port_number>', 'Port for the MCP server', process.env.DEVFLOW_LOCAL_AGENT_PORT || savedConfig.port || DEFAULT_PORT.toString())
  .option('-k, --api-key <key>', 'API key for authenticating clients TO this Local Agent', process.env.DEVFLOW_LOCAL_AGENT_API_KEY || savedConfig.apiKey);

const startServerAction = (options) => {
  const globalOpts = program.opts();
  const PORT = parseInt(options.port || globalOpts.port, 10);
  currentApiKey = options.apiKey || globalOpts.apiKey;
  currentProjectRoot = INITIAL_CWD; // Always use the directory where command was run

  if (isNaN(PORT)) {
    console.error(chalk.red('Error: Invalid port number.'));
    process.exit(1);
  }
  if (!currentApiKey) {
    console.error(chalk.red('Error: API Key for this Local Agent is required. Use --api-key, DEVFLOW_LOCAL_AGENT_API_KEY, or configure.'));
    process.exit(1);
  }

  try {
    if (!fs.existsSync(currentProjectRoot) || !fs.lstatSync(currentProjectRoot).isDirectory()) {
      console.error(chalk.red(`Error: Project root "${currentProjectRoot}" is not a valid directory.`));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`Error with project root "${currentProjectRoot}":`), error.message);
    process.exit(1);
  }

  console.log(chalk.blue(`Project root set to: ${currentProjectRoot}`));
  app.listen(PORT, () => {
    console.log(chalk.green.bold(`DevFlow AI Local Agent MCP HTTP Server started on http://localhost:${PORT}`));
    console.log(chalk.blue('Local Agent API Key Loaded. MCP Endpoints require X-DevFlow-API-Key header.'));
    console.log(chalk.yellow('Remote Supabase Gateway access is DISABLED (will be fixed in future).'));
  });
};

program
  .command('start-server', { isDefault: true })
  .description('Starts the Local Agent MCP HTTP server (default command).')
  .action(startServerAction);

program.command('hello').action(() => console.log(chalk.magenta.bold('Hello from DevFlow AI Local Agent!')));

program
  .command('configure')
  .description('Configure Local Agent settings.')
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
      }
    ];
    try {
      const answers = await inquirer.prompt(questions);
      const newConfig = {
        apiKey: answers.apiKey,
        port: parseInt(answers.port, 10)
      };
      writeConfig(newConfig);
    } catch (error) {
      console.error(chalk.red('Failed to save configuration:'), error.message);
    }
  });

// --- Stdio MCP Server Setup ---
const startStdioMcpServerAction = async () => {
  const hostApiKey = process.env.DEVFLOW_API_KEY;
  const maxRoot = process.env.DEVFLOW_MAX_ROOT ? path.resolve(process.env.DEVFLOW_MAX_ROOT) : null;

  // If DEVFLOW_PROJECT_ROOT is set, use that; otherwise use maxRoot as fallback
  let workingProjectRoot = process.env.DEVFLOW_PROJECT_ROOT ?
    path.resolve(process.env.DEVFLOW_PROJECT_ROOT) :
    (maxRoot || INITIAL_CWD);

  if (!hostApiKey) {
    console.error(chalk.red('Error: DEVFLOW_API_KEY env var is required for stdio MCP mode.'));
    process.exit(1);
  }

  // Validate maxRoot if provided
  if (maxRoot && (!fs.existsSync(maxRoot) || !fs.lstatSync(maxRoot).isDirectory())) {
    console.error(chalk.red(`Error: DEVFLOW_MAX_ROOT "${maxRoot}" is not a valid directory.`));
    process.exit(1);
  }

  // Validate that working directory exists and is within maxRoot if specified
  if (!fs.existsSync(workingProjectRoot) || !fs.lstatSync(workingProjectRoot).isDirectory()) {
    console.error(chalk.red(`Error: Working directory "${workingProjectRoot}" is not a valid directory.`));
    process.exit(1);
  }

  if (maxRoot && !workingProjectRoot.startsWith(maxRoot)) {
    console.error(chalk.red(`Error: Working directory "${workingProjectRoot}" is outside DEVFLOW_MAX_ROOT "${maxRoot}".`));
    console.error(chalk.yellow(`Tip: Set DEVFLOW_PROJECT_ROOT environment variable to specify the working directory.`));
    process.exit(1);
  }

  const mcpServer = new McpServer(
    { name: 'devflow-local-agent-mcp', version: packageJson.version },
    { capabilities: { tools: {} } }
  );

  // Only define local tools - no remote tools
  const localTools = [
    {
      name: 'get_local_file_content',
      description: 'Reads the content of a file from the local filesystem, relative to the current working directory.',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file, relative to current working directory.' },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'write_local_file_content',
      description: 'Writes content to a file on the local filesystem, relative to the current working directory.',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file, relative to current working directory.' },
          content: { type: 'string', description: 'The content to write to the file.' },
        },
        required: ['filePath', 'content'],
      },
    },
    {
      name: 'list_local_files',
      description: 'Lists files and directories within a path, relative to the current working directory.',
      inputSchema: {
        type: 'object',
        properties: {
          directoryPath: { type: 'string', description: 'Path to the directory to list, relative to current working directory.' },
          recursive: { type: 'boolean', default: false, description: 'Whether to list files recursively.' },
          ignore: { type: 'array', items: { type: 'string' }, description: 'Array of patterns to ignore.' },
        },
        required: ['directoryPath'],
      },
    },
    {
      name: 'execute_git_command',
      description: 'Executes a Git command within the current working directory.',
      inputSchema: {
        type: 'object',
        properties: {
          executionCwd: { type: 'string', default: '.', description: 'Path where the git command should execute, relative to current working directory.' },
          command_args: { type: 'array', items: { type: 'string' }, description: 'Array of arguments for the git command (e.g., ["status"]).' },
        },
        required: ['command_args'],
      },
    },
    {
      name: 'mkdir',
      description: 'Creates a directory and any necessary parent directories',
      inputSchema: {
        type: 'object',
        properties: {
          dirPath: { type: 'string', description: 'Path to the directory to create, relative to current working directory.' },
        },
        required: ['dirPath'],
      },
    },
    {
      name: 'touch',
      description: 'Creates a new empty file or updates the timestamp of an existing file',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to the file to create/touch, relative to current working directory.' },
        },
        required: ['filePath'],
      },
    }
  ];

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: localTools }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;
      switch (name) {
        case 'get_local_file_content':
          result = getFileContent(args.filePath, workingProjectRoot);
          break;
        case 'write_local_file_content':
          result = writeLocalFileContent(args.filePath, args.content, workingProjectRoot);
          break;
        case 'execute_git_command':
          result = { output: executeGitCommandUtility(args.command_args, args.executionCwd || '.', workingProjectRoot).trim() };
          break;
        case 'list_local_files':
          result = listLocalFiles(args.directoryPath, args.recursive, workingProjectRoot, args.ignore);
          break;
        case 'mkdir':
          result = createDirectory(args.dirPath, workingProjectRoot);
          break;
        case 'touch':
          result = touchFile(args.filePath, workingProjectRoot);
          break;
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Tool "${name}" not found.`);
      }
      return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] };
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(ErrorCode.InternalError, stripAnsi(error.message));
    }
  });

  mcpServer.onerror = (error) => {
    console.error(chalk.red('[MCP Stdio Error]'), error);
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

  console.error(chalk.green.bold('DevFlow AI Local Agent running in Stdio MCP mode.'));
  console.error(chalk.blue(`Working in project root: ${workingProjectRoot}`));
  console.error(chalk.blue(`DEVFLOW_MAX_ROOT: ${maxRoot || 'Not set'}`));
};

program
  .command('mcp-stdio')
  .description('Starts the Local Agent in Stdio MCP mode for integration with MCP hosts.')
  .action(startStdioMcpServerAction);

program.parse(process.argv);
