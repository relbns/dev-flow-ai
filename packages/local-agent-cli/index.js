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

function getFileContent(filePath, basePath) {
  const absolutePath = path.resolve(basePath, filePath);
  if (!absolutePath.startsWith(path.resolve(basePath))) {
    throw new Error(`Access denied: File path is outside the allowed project root.`);
  }
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found at ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function writeLocalFileContent(filePath, content, basePath) {
  const absolutePath = path.resolve(basePath, filePath);
  if (!absolutePath.startsWith(path.resolve(basePath))) {
    throw new Error(`Access denied: File path is outside the allowed project root.`);
  }
  fs.writeFileSync(absolutePath, content, 'utf8');
  return `Content successfully written to ${absolutePath}`;
}

function listLocalFiles(directoryPath, recursive = false, basePath, ignorePatterns = ['node_modules', '.git', '.DS_Store']) {
  const resolvedPathToList = path.resolve(basePath, directoryPath);
  if (!resolvedPathToList.startsWith(path.resolve(basePath))) {
    throw new Error(`Access denied: Directory path is outside the allowed project root.`);
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
    if (item.isDirectory()) {
      filesOutput.push({ name: itemName, type: 'directory', path: itemRelativePath.replace(/\\/g, '/') });
      if (recursive) {
        const subFiles = listLocalFiles(path.join(directoryPath, itemName), true, basePath, ignorePatterns);
        filesOutput.push(...subFiles.map(sf => ({...sf, path: path.join(itemName, sf.path).replace(/\\/g, '/')})));
      }
    } else {
      filesOutput.push({ name: itemName, type: 'file', path: itemRelativePath.replace(/\\/g, '/') });
    }
  }
  return filesOutput;
}

function executeGitCommandUtility(gitArgsArray, cwd) {
  const commandString = gitArgsArray.join(' ');
  const allowedCommandPatterns = [
    /^status(?: -s)?$/, /^rev-parse --abbrev-ref HEAD$/, /^checkout -b [\w.-]+$/, 
    /^checkout [\w.-]+$/, /^add (?:[\w.-/]+|\.)$/, /^commit -m ".+"$/, 
    /^push(?: [\w.-]+ [\w.-]+)?$/, /^pull(?: [\w.-]+ [\w.-]+)?$/, /^branch$/,
    /^log(?: -\d+)?(?: --oneline)?(?: --graph)?(?: --decorate)?(?: --all)?$/
  ];
  if (!allowedCommandPatterns.some(pattern => pattern.test(commandString))) {
    const err = new Error(`Command "git ${commandString}" is not allowed.`);
    err.allowedPatternsExamples = [ /* ... examples ... */ ];
    throw err;
  }
  if (!path.resolve(cwd).startsWith(path.resolve(currentProjectRoot))) {
      throw new Error(`Git command CWD is outside allowed project root. CWD: ${cwd}, Root: ${currentProjectRoot}`);
  }
  return execSync(`git ${commandString}`, { cwd, encoding: 'utf8' });
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
      case 'execute_git_command': result = { output: executeGitCommandUtility(args.command_args, currentProjectRoot).trim() }; break;
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


// ... (add back other direct CLI commands like get-file-content, git, list-files, write-file-content if needed, adapting them to use program.opts() for global options like --root)

program.parse(process.argv);
