// src/components/project/ProjectGitHub.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';

const ProjectGitHub = () => {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Github className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">GitHub Integration</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Connect this project to a GitHub repository to track commits,
          pull requests, and issues.
        </p>
        <Button>
          <Github className="h-4 w-4 mr-2" />
          Connect to GitHub
        </Button>
      </div>
    </div>
  );
};

export default ProjectGitHub;