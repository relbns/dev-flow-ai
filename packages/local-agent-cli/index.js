#!/usr/bin/env node

import dotenv from 'dotenv';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import express from 'express';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

dotenv.config();
const program = new Command();

const INITIAL_CWD = process.cwd();

function stripAnsi(str) {
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  return str.replace(ansiRegex, '');
}

function getFileContent(filePath, basePath) {
  const absolutePath = path.resolve(basePath, filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found at ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function writeLocalFileContent(filePath, content, basePath) {
  const absolutePath = path.resolve(basePath, filePath);
  fs.writeFileSync(absolutePath, content, 'utf8');
  return `Content successfully written to ${absolutePath}`;
}

function listLocalFiles(directoryPath, recursive = false, basePath, ignorePatterns = ['node_modules', '.git']) {
  const resolvedRootPathToList = path.resolve(basePath, directoryPath);
  if (!fs.existsSync(resolvedRootPathToList)) {
    throw new Error(`Directory not found at ${resolvedRootPathToList}`);
  }
  if (!fs.lstatSync(resolvedRootPathToList).isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedRootPathToList}`);
  }

  const filesOutput = [];
  const items = fs.readdirSync(resolvedRootPathToList, { withFileTypes: true });

  for (const item of items) {
    const itemName = item.name;
    if (ignorePatterns.includes(itemName)) {
      continue;
    }
    const itemRelativePath = path.join(directoryPath, itemName);

    if (item.isDirectory()) {
      filesOutput.push({ name: itemName, type: 'directory', path: itemRelativePath.replace(/\\/g, '/') });
      if (recursive) {
        const subFiles = listLocalFiles(itemRelativePath, true, basePath, ignorePatterns); // Pass ignorePatterns
        filesOutput.push(...subFiles);
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
    /^status$/, /^rev-parse --abbrev-ref HEAD$/, /^checkout -b \S+$/, 
    /^checkout \S+$/, /^add \.$/, /^commit -m ".*"$/, /^commit -m '.*'$/, /^push$/
  ];
  let isCommandAllowed = false;
  for (const pattern of allowedCommandPatterns) {
    if (pattern.test(commandString)) {
      isCommandAllowed = true;
      break;
    }
  }
  if (!isCommandAllowed) {
    const err = new Error(`Command "git ${commandString}" is not allowed or does not match expected pattern in this version.`);
    // @ts-ignore
    err.allowedPatterns = [
      'git status', 'git rev-parse --abbrev-ref HEAD', 'git checkout -b <branch>', 
      'git checkout <branch>', 'git add .', 'git commit -m "<message>"', 'git push'
    ];
    throw err;
  }
  return execSync(`git ${commandString}`, { cwd, encoding: 'utf8' });
}

const app = express();
app.use(express.json());
const DEFAULT_PORT = 52173;
const PORT = process.env.LOCAL_AGENT_PORT || DEFAULT_PORT;

app.get('/', (req, res) => res.send('DevFlow AI Local Agent MCP Server is running.'));
app.get('/mcp/status', (req, res) => {
  res.json({ status: 'active', timestamp: new Date().toISOString(), message: "Local Agent MCP Server is active." });
});
app.post('/mcp/get_local_file_content', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  try {
    const content = getFileContent(filePath, INITIAL_CWD);
    res.json({ filePath, content });
  } catch (error) {
    res.status(500).json({ error: stripAnsi(error.message) });
  }
});
app.post('/mcp/write_local_file_content', (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath is required' });
  if (typeof content !== 'string') return res.status(400).json({ error: 'content (string) is required' });
  try {
    const message = writeLocalFileContent(filePath, content, INITIAL_CWD);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: stripAnsi(error.message) });
  }
});
app.post('/mcp/list_local_files', (req, res) => {
  const { directoryPath, recursive, ignore } = req.body; // `ignore` could be an array of patterns
  if (!directoryPath) return res.status(400).json({ error: 'directoryPath is required' });
  try {
    // For now, hardcoded ignores are used in the utility.
    // If `ignore` is provided in request, it could override/extend defaults in future.
    const files = listLocalFiles(directoryPath, recursive || false, INITIAL_CWD); 
    res.json({ directoryPath, recursive, files });
  } catch (error) {
    res.status(500).json({ error: stripAnsi(error.message) });
  }
});
app.post('/mcp/execute_git_command', (req, res) => {
  const { command_args } = req.body;
  if (!command_args || !Array.isArray(command_args) || command_args.length === 0) {
    return res.status(400).json({ error: 'command_args (array of strings) is required' });
  }
  const commandString = command_args.join(' ');
  try {
    const allowedCommandPatterns = [ 
        /^status$/, /^rev-parse --abbrev-ref HEAD$/, /^checkout -b \S+$/, 
        /^checkout \S+$/, /^add \.$/, /^commit -m ".*"$/, /^commit -m '.*'$/, /^push$/
    ];
    let isCommandAllowed = false;
    for (const pattern of allowedCommandPatterns) {
      if (pattern.test(commandString)) {
        isCommandAllowed = true;
        break;
      }
    }
    if (!isCommandAllowed) {
      return res.status(400).json({ error: `Command "git ${commandString}" is not allowed or does not match expected pattern.` });
    }
    const output = execSync(`git ${commandString}`, { cwd: INITIAL_CWD, encoding: 'utf8' });
    res.json({ command: `git ${commandString}`, output: output.trim() });
  } catch (error) {
    res.status(500).json({ 
      error: `Error executing git command "git ${commandString}": ${stripAnsi(error.message)}`, 
      stderr: error.stderr ? error.stderr.toString().trim() : undefined 
    });
  }
});

const startServerAction = () => {
  console.log(chalk.blue(`Project root (for server operations): ${INITIAL_CWD}`));
  app.listen(PORT, () => {
    console.log(chalk.green.bold(`DevFlow AI Local Agent MCP Server started on http://localhost:${PORT}`));
    console.log(chalk.blue('Operating relative to project root:'), chalk.yellow(INITIAL_CWD));
    console.log(chalk.blue('Available MCP endpoints (examples):'));
    console.log(chalk.cyan(`  GET  /mcp/status`));
    console.log(chalk.cyan(`  POST /mcp/get_local_file_content (body: { "filePath": "path/to/your/file.txt" })`));
    console.log(chalk.cyan(`  POST /mcp/write_local_file_content (body: { "filePath": "path/to/file.txt", "content": "Hello World" })`));
    console.log(chalk.cyan(`  POST /mcp/execute_git_command (body: { "command_args": ["status"] })`));
    console.log(chalk.cyan(`  POST /mcp/list_local_files (body: { "directoryPath": "./", "recursive": false })`));
  });
};

program
  .version('0.0.1')
  .description('Local agent CLI for DevFlow AI. Use "start-server" to launch the MCP server, or run without arguments to start server by default.');

program
  .command('start-server')
  .description('Starts the Local Agent MCP HTTP server.')
  .action(startServerAction);

program
  .command('hello')
  .description('Prints a hello message from the local agent (direct CLI mode).')
  .action(() => {
    console.log(chalk.magenta.bold('Hello from the DevFlow AI Local Agent CLI (direct mode)!'));
    console.log(chalk.blue('This agent can also host an MCP server to interact with your local codebase.'));
    console.log(chalk.blue('Run "devflow-local-agent start-server" or "npm start" in this package to launch it.'));
  });

program
  .command('get-file-content <filePath>')
  .description('Reads and prints the content of a local file (direct CLI mode).')
  .action((filePath) => {
    try {
      const content = getFileContent(filePath, process.cwd()); 
      console.log(chalk.blue(`Content of ${chalk.underline(path.resolve(process.cwd(), filePath))}:\n`));
      console.log(content);
    } catch (error) {
      console.error(chalk.red(stripAnsi(error.message)));
      process.exit(1);
    }
  });

program
  .command('git <gitArgs...>')
  .description('Executes a git command with the provided arguments (direct CLI mode).')
  .action(async (gitArgs) => { 
    const commandString = gitArgs.join(' ');
    const spinner = ora({
      text: chalk.yellow(`Executing: git ${commandString} (in ${process.cwd()})`),
      spinner: 'dots'
    }).start();
    try {
      const output = executeGitCommandUtility(gitArgs, process.cwd()); 
      spinner.succeed(chalk.green(`Successfully executed: git ${commandString}`));
      if (output.trim()) {
        console.log(output.trim());
      }
    } catch (error) {
      spinner.fail(chalk.red(`Error executing git command "git ${commandString}":`));
      console.error(stripAnsi(error.message)); 
      // @ts-ignore
       if (error.allowedPatterns) { 
        console.error(chalk.yellow('Allowed git command patterns are (examples):'));
        // @ts-ignore
        error.allowedPatterns.forEach(p => console.error(chalk.yellowBright(`  ${p}`)));
      }
      if (error.stderr) {
        console.error(chalk.red("Git stderr:\n"), error.stderr);
      }
      process.exit(1);
    }
  });

program
  .command('list-files <directoryPath>')
  .option('-r, --recursive', 'List files recursively')
  .description('Lists files in a directory (direct CLI mode).')
  .action((directoryPath, options) => {
    try {
      const files = listLocalFiles(directoryPath, options.recursive || false, process.cwd());
      const resolvedRootDisplayPath = path.resolve(process.cwd(), directoryPath);
      console.log(chalk.blue(`Files in ${chalk.underline(resolvedRootDisplayPath)}${options.recursive ? ' (recursive):' : ':'}\n`));
      files.forEach(file => {
        const typeColor = file.type === 'directory' ? chalk.cyan : chalk.white;
        console.log(`  ${typeColor(file.path)} (${chalk.italic(file.type)})`);
      });
    } catch (error) {
      console.error(stripAnsi(error.message));
      process.exit(1);
    }
  });

program
  .command('write-file-content <filePath> [content]')
  .description('Writes content to a local file (direct CLI mode). If content is not provided, writes an empty string.')
  .action(async (filePath, content) => { 
    try {
      const absolutePath = path.resolve(process.cwd(), filePath); 
      if (fs.existsSync(absolutePath)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: chalk.yellow(`File ${chalk.underline(absolutePath)} already exists. Overwrite?`),
            default: false,
          },
        ]);
        if (!overwrite) {
          console.log(chalk.yellow('Operation cancelled by user.'));
          process.exit(0);
        }
      }
      const message = writeLocalFileContent(filePath, content || "", process.cwd());
      console.log(chalk.green(message)); 
    } catch (error) {
      console.error(chalk.red(`Error writing to file ${chalk.underline(filePath)}:`), stripAnsi(error.message));
      process.exit(1);
    }
  });

program.action(() => {
    const args = process.argv.slice(2);
    let commandExplicitlyCalled = false;
    program.commands.forEach(cmd => {
        if (args.includes(cmd.name())) {
            commandExplicitlyCalled = true;
        }
    });

    if (!commandExplicitlyCalled && args.filter(arg => !arg.startsWith('-')).length === 0) {
        startServerAction();
    } else if (!commandExplicitlyCalled && args.length === 0) {
        startServerAction();
    }
});

program.parse(process.argv);
