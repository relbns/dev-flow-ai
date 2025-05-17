import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import os from 'os';

const APP_NAME = 'devflow-local-agent';

function getConfigPath() {
  let configDir;
  switch (os.platform()) {
    case 'win32': // Windows
      configDir = path.join(process.env.APPDATA || os.homedir(), APP_NAME);
      break;
    case 'darwin': // macOS
      configDir = path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
      break;
    case 'linux': // Linux
    default:
      configDir = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), APP_NAME);
      break;
  }
  fs.ensureDirSync(configDir); // Create directory if it doesn't exist
  return path.join(configDir, 'config.json');
}

export function readConfig() {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const rawData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(rawData);
    }
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not read config file at ${configPath}. Using defaults. Error: ${error.message}`));
  }
  return {}; // Return empty object if no config or error
}

export function writeConfig(configData) {
  const configPath = getConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
    // Set permissions to be readable/writable only by the current user (more secure)
    // On Unix-like systems (macOS, Linux)
    if (os.platform() !== 'win32') {
      fs.chmodSync(configPath, 0o600);
    }
    console.log(chalk.green(`Configuration saved to ${configPath}`));
  } catch (error) {
    console.error(chalk.red(`Error saving configuration to ${configPath}: ${error.message}`));
    throw error; // Re-throw for configure command to handle
  }
}

// Get the path to the lock file
export function getAgentLockFile() {
  let configDir;
  switch (os.platform()) {
    case 'win32': // Windows
      configDir = path.join(process.env.APPDATA || os.homedir(), APP_NAME);
      break;
    case 'darwin': // macOS
      configDir = path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
      break;
    case 'linux': // Linux
    default:
      configDir = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), APP_NAME);
      break;
  }
  fs.ensureDirSync(configDir); // Create directory if it doesn't exist
  return path.join(configDir, 'agent.lock');
}

// Check if the agent is already running
export function checkAgentRunning() {
  const lockFile = getAgentLockFile();
  
  if (!fs.existsSync(lockFile)) {
    return false;
  }
  
  try {
    const lockData = fs.readFileSync(lockFile, 'utf8');
    const lockInfo = JSON.parse(lockData);
    
    // Check if the process is still running
    if (lockInfo.pid) {
      try {
        // On POSIX systems, sending signal 0 checks if the process exists
        process.kill(lockInfo.pid, 0);
        return true; // Process exists
      } catch (e) {
        // Process doesn't exist, remove the lock file
        try {
          fs.unlinkSync(lockFile);
        } catch (unlinkError) {
          console.warn(chalk.yellow(`Warning: Failed to remove stale lock file at ${lockFile}: ${unlinkError.message}`));
        }
        return false;
      }
    }
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not read or parse lock file at ${lockFile}: ${error.message}`));
    // Try to remove the invalid lock file
    try {
      fs.unlinkSync(lockFile);
    } catch (unlinkError) {
      // Ignore errors when removing invalid lock file
    }
    return false;
  }
  
  return false;
}

// Get information about the currently running agent
export function getLockInfo() {
  const lockFile = getAgentLockFile();
  
  if (!fs.existsSync(lockFile)) {
    return null;
  }
  
  try {
    const lockData = fs.readFileSync(lockFile, 'utf8');
    return JSON.parse(lockData);
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not read or parse lock file at ${lockFile}: ${error.message}`));
    return null;
  }
}
