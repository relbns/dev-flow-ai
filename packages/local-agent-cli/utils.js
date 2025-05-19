// utils.js - Utility functions for DevFlow Local Agent
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';

const APP_NAME = 'devflow-local-agent';

/**
 * Get the path to the agent lock file
 * @returns {string} Path to lock file
 */
export function getAgentLockFile () {
    const lockDir = os.platform() === 'win32'
        ? path.join(os.tmpdir(), APP_NAME)
        : path.join('/tmp', APP_NAME);

    fs.ensureDirSync(lockDir);
    return path.join(lockDir, 'agent.lock');
}

/**
 * Check if an agent is already running
 * @returns {boolean} True if an agent is running
 */
export function checkAgentRunning () {
    const lockFile = getAgentLockFile();

    if (!fs.existsSync(lockFile)) {
        return false;
    }

    try {
        const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));

        // Check if the process is still running
        if (!lockData.pid) {
            return false;
        }

        try {
            // Try to signal the process (0 means no signal, just checking existence)
            process.kill(lockData.pid, 0);
            return true; // Process exists
        } catch (e) {
            // Process doesn't exist, clean up the lock file
            fs.unlinkSync(lockFile);
            return false;
        }
    } catch (error) {
        // Invalid lock file, clean it up
        fs.unlinkSync(lockFile);
        return false;
    }
}

/**
 * Get information about the running agent
 * @returns {Object} Lock information
 */
export function getLockInfo () {
    const lockFile = getAgentLockFile();

    if (!fs.existsSync(lockFile)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    } catch (error) {
        console.error(chalk.red(`Error reading lock file: ${error.message}`));
        return null;
    }
}

/**
 * Get content of a local file
 * @param {string} filePath - Path to file
 * @param {string} projectRoot - Root directory to validate against
 * @returns {string} File content
 */
export function getFileContent (filePath, projectRoot) {
    if (!filePath) {
        throw new McpError(ErrorCode.InvalidParams, 'File path is required');
    }

    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(projectRoot, filePath);

    // Validate the path is within project root
    if (!absolutePath.startsWith(projectRoot)) {
        throw new McpError(ErrorCode.PermissionDenied, 'Cannot read file outside project root');
    }

    if (!fs.existsSync(absolutePath)) {
        throw new McpError(ErrorCode.InvalidParams, `File not found: ${filePath}`);
    }

    try {
        return fs.readFileSync(absolutePath, 'utf8');
    } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Failed to read file: ${error.message}`);
    }
}

/**
 * Write content to a local file
 * @param {string} filePath - Path to file
 * @param {string} content - Content to write
 * @param {string} projectRoot - Root directory to validate against
 * @returns {Object} Success message
 */
export function writeLocalFileContent (filePath, content, projectRoot) {
    if (!filePath) {
        throw new McpError(ErrorCode.InvalidParams, 'File path is required');
    }

    if (content === undefined || content === null) {
        throw new McpError(ErrorCode.InvalidParams, 'Content is required');
    }

    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(projectRoot, filePath);

    // Validate the path is within project root
    if (!absolutePath.startsWith(projectRoot)) {
        throw new McpError(ErrorCode.PermissionDenied, 'Cannot write file outside project root');
    }

    try {
        // Ensure the directory exists
        fs.ensureDirSync(path.dirname(absolutePath));

        // Write the file
        fs.writeFileSync(absolutePath, content, 'utf8');

        return {
            success: true,
            path: absolutePath,
            message: `File written successfully: ${path.relative(projectRoot, absolutePath)}`
        };
    } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Failed to write file: ${error.message}`);
    }
}

/**
 * List files in a local directory
 * @param {string} directoryPath - Directory to list
 * @param {boolean} recursive - Whether to list recursively
 * @param {string} projectRoot - Root directory to validate against
 * @param {Array<string>} ignore - Patterns to ignore
 * @returns {Object} List of files
 */
export function listLocalFiles (directoryPath, recursive, projectRoot, ignore = []) {
    const dirPath = directoryPath || '.';
    const absoluteDir = path.isAbsolute(dirPath)
        ? dirPath
        : path.resolve(projectRoot, dirPath);

    // Validate the path is within project root
    if (!absoluteDir.startsWith(projectRoot)) {
        throw new McpError(ErrorCode.PermissionDenied, 'Cannot list files outside project root');
    }

    if (!fs.existsSync(absoluteDir)) {
        throw new McpError(ErrorCode.InvalidParams, `Directory not found: ${dirPath}`);
    }

    if (!fs.lstatSync(absoluteDir).isDirectory()) {
        throw new McpError(ErrorCode.InvalidParams, `Not a directory: ${dirPath}`);
    }

    try {
        const results = {
            path: absoluteDir,
            relativePath: path.relative(projectRoot, absoluteDir),
            files: [],
            directories: []
        };

        // Default ignore patterns
        const ignorePatterns = ['.git', 'node_modules', '.DS_Store', '*.log'];
        if (Array.isArray(ignore)) {
            ignorePatterns.push(...ignore);
        }

        const shouldIgnore = (itemPath) => {
            const basename = path.basename(itemPath);
            return ignorePatterns.some(pattern => {
                if (pattern.includes('*')) {
                    // Very basic wildcard matching
                    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
                    return regex.test(basename);
                }
                return basename === pattern;
            });
        };

        // Helper function to process a directory
        const processDirectory = (currentPath, isRoot = false) => {
            const items = fs.readdirSync(currentPath);

            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                const relativePath = path.relative(projectRoot, itemPath);

                if (shouldIgnore(itemPath)) continue;

                const stats = fs.lstatSync(itemPath);

                if (stats.isDirectory()) {
                    // Add directory to the list
                    if (isRoot) {
                        results.directories.push({
                            name: item,
                            path: relativePath
                        });
                    }

                    // Recursively process subdirectories if requested
                    if (recursive) {
                        processDirectory(itemPath);
                    }
                } else if (stats.isFile()) {
                    if (isRoot || recursive) {
                        results.files.push({
                            name: item,
                            path: relativePath,
                            size: stats.size,
                            modified: stats.mtime.toISOString()
                        });
                    }
                }
            }
        };

        // Process the root directory
        processDirectory(absoluteDir, true);

        // Sort results for better readability
        results.directories.sort((a, b) => a.name.localeCompare(b.name));
        results.files.sort((a, b) => a.name.localeCompare(b.name));

        return results;
    } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Failed to list files: ${error.message}`);
    }
}

/**
 * Execute a git command
 * @param {Array<string>} command_args - Git command arguments
 * @param {string} executionCwd - Current working directory for command execution
 * @param {string} projectRoot - Root directory to validate against
 * @returns {string} Command output
 */
export function executeGitCommandUtility (command_args, executionCwd, projectRoot) {
    if (!Array.isArray(command_args) || command_args.length === 0) {
        throw new McpError(ErrorCode.InvalidParams, 'Git command arguments must be a non-empty array');
    }

    // Validate execution directory
    const absoluteExecutionDir = path.isAbsolute(executionCwd)
        ? executionCwd
        : path.resolve(projectRoot, executionCwd);

    if (!absoluteExecutionDir.startsWith(projectRoot)) {
        throw new McpError(ErrorCode.PermissionDenied, 'Cannot execute command outside project root');
    }

    if (!fs.existsSync(absoluteExecutionDir)) {
        throw new McpError(ErrorCode.InvalidParams, `Execution directory not found: ${executionCwd}`);
    }

    // Disallow destructive Git commands
    const disallowedCommands = ['clean', 'reset', 'push', 'rm'];
    if (disallowedCommands.includes(command_args[0])) {
        throw new McpError(ErrorCode.PermissionDenied, `Git command "${command_args[0]}" is not allowed for safety reasons`);
    }

    try {
        const command = ['git', ...command_args].join(' ');
        return execSync(command, {
            cwd: absoluteExecutionDir,
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large git outputs
        });
    } catch (error) {
        throw new McpError(ErrorCode.InternalError, `Git command failed: ${error.message}`);
    }
}