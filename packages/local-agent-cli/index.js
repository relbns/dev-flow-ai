  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...localTools, ...remoteTools] }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name.startsWith('remote_')) {
      const config = readConfig();
      const backendUrl = config.backendUrl || DEFAULT_BACKEND_URL;
      const remoteApiKeyForGateway = config.devflowApiKeyRemote || hostApiKey; 
      
      const actualToolName = name.substring('remote_'.length);
      const mcpGatewayUrl = `${backendUrl}/mcp`;
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
      // Special handling - auto-inject the current root directory if not specified
      // This makes Claude's life easier as it doesn't need to specify the project root each time
      if (!args.projectRoot && localTools.some(lt => lt.name === name)) {
        args.projectRoot = maxRoot;
        console.error(chalk.yellow(`[MCP Stdio] Auto-injecting projectRoot=${maxRoot} for tool ${name}`));
      }
      
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
          case 'list_local_files': result = listLocalFiles(args.directoryPath, args.recursive, callProjectRoot, args.ignore); break;
          case 'execute_git_command': result = { output: executeGitCommandUtility(args.command_args, args.executionCwd || '.', callProjectRoot).trim() }; break;
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
  console.error(chalk.blue(`Project root: ${maxRoot}`));
  console.error(chalk.blue(`API Key: ${hostApiKey}`));
};

// Default command - do stdio mode for Claude to use
program
  .command('start', { isDefault: true })
  .description('Starts the DevFlow AI Local Agent in stdio mode (default mode).')
  .action(startStdioMcpServerAction);

// Add a command to stop any running agent
program
  .command('stop')
  .description('Stops any running DevFlow AI Local Agent.')
  .action(() => {
    if (checkAgentRunning()) {
      const lockInfo = getLockInfo();
      console.log(chalk.yellow(`Stopping DevFlow Agent (PID: ${lockInfo.pid})...`));
      try {
        process.kill(lockInfo.pid, 'SIGTERM');
        console.log(chalk.green('Agent stopped successfully.'));
        // Remove the lock file
        fs.unlinkSync(getAgentLockFile());
      } catch (error) {
        console.error(chalk.red(`Failed to stop agent: ${error.message}`));
        console.log(chalk.yellow('Removing lock file anyway...'));
        // Force remove the lock file
        try {
          fs.unlinkSync(getAgentLockFile());
        } catch (e) {
          console.error(chalk.red(`Failed to remove lock file: ${e.message}`));
        }
      }
    } else {
      console.log(chalk.yellow('No DevFlow Agent is currently running.'));
    }
  });

// Add a command to switch the root directory
program
  .command('switch-root [path]')
  .description('Switch the root directory of the agent to the specified path or current directory.')
  .action((path) => {
    const newRoot = path ? path : INITIAL_CWD;
    console.log(chalk.blue(`Switching root to: ${newRoot}`));
    
    // Update the config with the new root
    const config = readConfig();
    config.root = newRoot;
    writeConfig(config);
    
    console.log(chalk.green('Root directory updated. The change will apply to future sessions.'));
    
    // If agent is running, ask if user wants to restart it
    if (checkAgentRunning()) {
      const lockInfo = getLockInfo();
      console.log(chalk.yellow(`Agent is currently running with root at: ${lockInfo.projectRoot}`));
      
      // Prompt to restart
      inquirer.prompt([{
        type: 'confirm',
        name: 'restart',
        message: 'Would you like to restart the agent with the new root?',
        default: true
      }]).then(answers => {
        if (answers.restart) {
          console.log(chalk.yellow(`Stopping existing agent (PID: ${lockInfo.pid})...`));
          try {
            process.kill(lockInfo.pid, 'SIGTERM');
            console.log(chalk.green('Existing agent stopped.'));
            
            // Remove the lock file
            fs.unlinkSync(getAgentLockFile());
            
            // Start new agent in the same mode
            if (lockInfo.mode === 'http') {
              startServerAction({});
            } else {
              startStdioMcpServerAction();
            }
          } catch (error) {
            console.error(chalk.red(`Failed to restart agent: ${error.message}`));
          }
        }
      });
    }
  });

// Command to list running agents
program
  .command('status')
  .description('Check the status of any running DevFlow AI Local Agent.')
  .action(() => {
    if (checkAgentRunning()) {
      const lockInfo = getLockInfo();
      console.log(chalk.green('DevFlow Agent is currently running:'));
      console.log(chalk.blue(`- Process ID: ${lockInfo.pid}`));
      console.log(chalk.blue(`- Mode: ${lockInfo.mode}`));
      console.log(chalk.blue(`- Project root: ${lockInfo.projectRoot}`));
      if (lockInfo.port) {
        console.log(chalk.blue(`- HTTP Server port: ${lockInfo.port}`));
      }
      console.log(chalk.blue(`- Started: ${lockInfo.timestamp}`));
    } else {
      console.log(chalk.yellow('No DevFlow Agent is currently running.'));
      
      // Show the configured root
      const config = readConfig();
      if (config.root) {
        console.log(chalk.blue(`Configured root directory: ${config.root}`));
      } else {
        console.log(chalk.blue(`No root directory configured. Will use current directory.`));
      }
    }
  });

program
  .command('mcp-stdio')
  .description('Starts the Local Agent in Stdio MCP mode (same as default command).')
  .action(startStdioMcpServerAction);

program.parse(process.argv);
