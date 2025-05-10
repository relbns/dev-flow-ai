#!/usr/bin/env node

require('dotenv').config();
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const program = new Command();

program
  .version('0.0.1')
  .description('Local agent CLI for DevFlow AI');

program
  .command('hello')
  .description('Prints a hello message from the local agent.')
  .action(() => {
    console.log('Hello from the DevFlow AI Local Agent CLI!');
    console.log('This agent will eventually host an MCP server to interact with your local codebase.');
  });

program
  .command('get-file-content <filePath>')
  .description('Reads and prints the content of a local file.')
  .action((filePath) => {
    try {
      const absolutePath = path.resolve(filePath);
      if (!fs.existsSync(absolutePath)) {
        console.error(`Error: File not found at ${absolutePath}`);
        process.exit(1);
      }
      const content = fs.readFileSync(absolutePath, 'utf8');
      console.log(`Content of ${absolutePath}:\n`);
      console.log(content);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
      process.exit(1);
    }
  });

program
  .command('git <gitArgs...>')
  .description('Executes a git command with the provided arguments.')
  .action((gitArgs) => {
    try {
      // Basic security: For now, only allow specific, safe commands.
      // PRD V1 specifies 'status' and 'rev-parse --abbrev-ref HEAD'.
      // PRD Step 10 expands to: checkout, add, commit, push.
      const commandString = gitArgs.join(' ');
      const allowedCommandPatterns = [
        /^status$/,
        /^rev-parse --abbrev-ref HEAD$/,
        /^checkout -b \S+$/, // checkout -b <branchname>
        /^checkout \S+$/,     // checkout <branchname>
        /^add \.$/,           // add .
        /^commit -m ".*"$/,   // commit -m "<message>" (simple quoted message)
        /^commit -m '.*'$/,   // commit -m '<message>' (simple quoted message)
        /^push$/
      ];

      let isCommandAllowed = false;
      for (const pattern of allowedCommandPatterns) {
        if (pattern.test(commandString)) {
          isCommandAllowed = true;
          break;
        }
      }

      if (!isCommandAllowed) {
        console.error(`Error: Command "git ${commandString}" is not allowed or does not match expected pattern in this version.`);
        console.error('Allowed git command patterns are (examples):');
        console.error('  git status');
        console.error('  git rev-parse --abbrev-ref HEAD');
        console.error('  git checkout -b new-branch-name');
        console.error('  git checkout existing-branch-name');
        console.error('  git add .');
        console.error('  git commit -m "Your commit message"');
        console.error('  git push');
        process.exit(1);
      }

      console.log(`Executing: git ${commandString}\n`);
      const output = execSync(`git ${commandString}`, { encoding: 'utf8' });
      console.log(output);
    } catch (error) {
      console.error(`Error executing git command "git ${gitArgs.join(' ')}":`, error.message);
      if (error.stderr) {
        console.error("Git stderr:\n", error.stderr);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
