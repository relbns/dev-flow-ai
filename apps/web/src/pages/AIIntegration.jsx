
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { CodeIcon, Terminal, Copy, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const AIIntegration = () => {
  const apiEndpoint = 'http://localhost:8000/api';
  const mcpEndpoint = `${apiEndpoint}/mcp`;
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // In a real app, show a toast notification
    console.log('Copied to clipboard:', text);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="overview">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="setup">Setup Guide</TabsTrigger>
              <TabsTrigger value="api">API Reference</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>AI Integration for CodeTaskHub</CardTitle>
                  <CardDescription>
                    Enable AI assistants to manage your projects and tasks through various integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">How It Works</h3>
                    <p className="text-muted-foreground mt-1">
                      CodeTaskHub provides Model Context Protocol (MCP) endpoints that AI tools can connect to
                      for accessing and managing your projects and tasks. This allows AI assistants to:
                    </p>
                    <ul className="list-disc pl-5 mt-3 space-y-1 text-muted-foreground">
                      <li>Browse available projects and tasks</li>
                      <li>Select a project context to work on</li>
                      <li>Create, update, and complete tasks</li>
                      <li>Access project metadata and GitHub integration</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium">Supported Integrations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <Card>
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Cursor AI</CardTitle>
                            <Badge>Supported</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-4 pt-0">
                          <p className="text-sm text-muted-foreground">
                            IDE integration for managing tasks directly from your code editor
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Cline</CardTitle>
                            <Badge>Supported</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-4 pt-0">
                          <p className="text-sm text-muted-foreground">
                            Terminal-based AI assistant with project context awareness
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Custom MCP Clients</CardTitle>
                            <Badge variant="outline">Compatible</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-4 pt-0">
                          <p className="text-sm text-muted-foreground">
                            Any tool implementing the MCP protocol specification
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">REST API</CardTitle>
                            <Badge variant="outline">Available</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-4 pt-0">
                          <p className="text-sm text-muted-foreground">
                            Direct API access for custom integrations
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="setup">
              <Card>
                <CardHeader>
                  <CardTitle>Setup Guide</CardTitle>
                  <CardDescription>
                    Follow these steps to connect your AI tools to CodeTaskHub
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Step 1: Enable API Access</h3>
                      <div className="flex items-center gap-4">
                        <Button>Enable API</Button>
                        <Badge variant="outline" className="text-green-500">Enabled</Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Step 2: Generate API Key</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <Input 
                            value="sk_codetask_xxxxxxxxxxxxxxx" 
                            readOnly 
                            className="font-mono bg-secondary"
                          />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard('sk_codetask_xxxxxxxxxxxxxxx')}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button>Generate New Key</Button>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Step 3: MCP Server URL</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <Input 
                            value={mcpEndpoint} 
                            readOnly 
                            className="font-mono bg-secondary"
                          />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(mcpEndpoint)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Use this URL in your AI tools to connect to CodeTaskHub
                        </p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Step 4: Configure Your Tools</h3>
                      
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Cursor AI</h4>
                            <a href="https://cursor.sh/docs/ai-integration" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-primary hover:underline">
                              Documentation <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                          <div className="bg-secondary p-3 rounded font-mono text-sm overflow-x-auto">
                            <pre>
                              # In Cursor, enter this in the command palette:<br />
                              /mcp connect {mcpEndpoint} --api-key=sk_codetask_xxxxxxxxxxxxxxx
                            </pre>
                          </div>
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Cline</h4>
                            <a href="https://cline.tools/docs" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-primary hover:underline">
                              Documentation <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                          <div className="bg-secondary p-3 rounded font-mono text-sm overflow-x-auto">
                            <pre>
                              # In your terminal with Cline installed:<br />
                              cline config set mcp.url {mcpEndpoint}<br />
                              cline config set mcp.api_key sk_codetask_xxxxxxxxxxxxxxx<br />
                              cline connect mcp
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="api">
              <Card>
                <CardHeader>
                  <CardTitle>API Reference</CardTitle>
                  <CardDescription>
                    Technical details for custom integrations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">MCP Protocol</h3>
                      <p className="text-muted-foreground">
                        CodeTaskHub implements the Model Context Protocol (MCP) for AI context sharing.
                      </p>
                      <div className="mt-4">
                        <Label>Base URL</Label>
                        <div className="flex items-center gap-4 mt-1">
                          <Input 
                            value={mcpEndpoint} 
                            readOnly 
                            className="font-mono bg-secondary"
                          />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(mcpEndpoint)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-3">Endpoints</h3>
                      
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>GET</Badge>
                            <code className="text-sm">/projects</code>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            List all accessible projects
                          </p>
                          <div className="bg-secondary p-3 rounded text-sm overflow-x-auto">
                            <pre>
{`// Response format
{
  "projects": [
    {
      "id": "project-id",
      "name": "Project Name",
      "description": "Project description",
      "organization": "org-id" | null
    }
  ]
}`}
                            </pre>
                          </div>
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>GET</Badge>
                            <code className="text-sm">/projects/:id/tasks</code>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            List all tasks for a specific project
                          </p>
                          <div className="bg-secondary p-3 rounded text-sm overflow-x-auto">
                            <pre>
{`// Response format
{
  "tasks": [
    {
      "id": "task-id",
      "title": "Task title",
      "description": "Task description",
      "status": "notStarted" | "inProgress" | "completed",
      "priority": "low" | "medium" | "high"
    }
  ]
}`}
                            </pre>
                          </div>
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>POST</Badge>
                            <code className="text-sm">/projects/:id/tasks</code>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Create a new task in a specific project
                          </p>
                          <div className="bg-secondary p-3 rounded text-sm overflow-x-auto">
                            <pre>
{`// Request body
{
  "title": "Task title",
  "description": "Task description",
  "status": "notStarted" | "inProgress" | "completed",
  "priority": "low" | "medium" | "high"
}

// Response - the created task
{
  "id": "new-task-id",
  "title": "Task title",
  "description": "Task description",
  "status": "notStarted",
  "priority": "medium"
}`}
                            </pre>
                          </div>
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>PATCH</Badge>
                            <code className="text-sm">/tasks/:id</code>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Update a task's status or other properties
                          </p>
                          <div className="bg-secondary p-3 rounded text-sm overflow-x-auto">
                            <pre>
{`// Request body (all fields optional)
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "completed",
  "priority": "high"
}

// Response - the updated task
{
  "id": "task-id",
  "title": "Updated title",
  "description": "Updated description",
  "status": "completed",
  "priority": "high"
}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    <CodeIcon className="h-4 w-4 mr-2" />
                    Download OpenAPI Specification
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AIIntegration;
