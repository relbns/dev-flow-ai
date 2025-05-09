
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useCommandPalette = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('http://localhost:8000/api'); // Mock API endpoint for AI integration

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // For AI integration
  const getApiStatusUrl = () => {
    return `${apiEndpoint}/status`;
  };

  const getMcpServerUrl = () => {
    return `${apiEndpoint}/mcp`;
  };

  const runCommand = (command) => {
    setOpen(false);
    command();
  };

  const completeTask = (taskId) => {
    console.log(`Completing task ${taskId}`);
    // In a real app, you'd update the task status via API or state management
    setOpen(false);
  };

  const aiIntegrationInfo = () => {
    console.log("Displaying AI integration information");
    // In a real app, you'd show detailed instructions on how to connect AI clients
    setOpen(false);
    navigate('/settings/ai-integration');
  };

  return {
    open,
    setOpen,
    apiEndpoint,
    getApiStatusUrl,
    getMcpServerUrl,
    runCommand,
    completeTask,
    aiIntegrationInfo
  };
};
