
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandGroup,
  CommandItem,
  CommandSeparator
} from '@/components/ui/command';
import { Terminal, Code } from 'lucide-react';

const AiIntegrationSection = ({ apiEndpoint, runCommand }) => {
  const navigate = useNavigate();
  
  const getMcpServerUrl = () => {
    return `${apiEndpoint}/mcp`;
  };

  const aiIntegrationInfo = () => {
    console.log("Displaying AI integration information");
    // In a real app, you'd show detailed instructions on how to connect AI clients
    navigate('/settings/ai-integration');
  };

  return (
    <>
      <CommandGroup heading="AI Integration">
        <CommandItem
          onSelect={() => runCommand(aiIntegrationInfo)}
        >
          <Terminal className="mr-2 h-4 w-4" />
          AI Integration Settings
        </CommandItem>
        <CommandItem>
          <Code className="mr-2 h-4 w-4" />
          MCP API Endpoint: {getMcpServerUrl()}
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
    </>
  );
};

export default AiIntegrationSection;
