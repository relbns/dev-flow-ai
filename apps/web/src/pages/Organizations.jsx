
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Settings, Users, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const Organizations = () => {
  const [organizations, setOrganizations] = useState([
    { 
      id: 'org1', 
      name: 'Frontend Team', 
      description: 'Team focused on UI/UX and frontend development',
      members: 5,
      role: 'Admin',
      projects: 3
    },
    { 
      id: 'org2', 
      name: 'Backend Engineers', 
      description: 'Core backend and API development team',
      members: 7,
      role: 'Member',
      projects: 5
    },
    { 
      id: 'org3', 
      name: 'Mobile Dev Group', 
      description: 'Cross-platform mobile application development',
      members: 4,
      role: 'Member',
      projects: 2
    }
  ]);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  
  const handleCreateOrganization = (e) => {
    e.preventDefault();
    // In a real app, you'd create the organization via API
    setCreateDialogOpen(false);
  };
  
  const handleJoinOrganization = (e) => {
    e.preventDefault();
    // In a real app, you'd join the organization via invite code
    setJoinDialogOpen(false);
  };
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Organization
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Create New Organization</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateOrganization} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Organization Name</Label>
                      <Input id="name" placeholder="Enter organization name" required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Enter organization description" 
                        className="min-h-24" 
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create Organization</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Organization
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Join an Organization</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleJoinOrganization} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">Invitation Code</Label>
                      <Input id="inviteCode" placeholder="Enter invitation code" required />
                      <p className="text-sm text-muted-foreground mt-1">
                        Ask an organization admin to provide you with an invitation code
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setJoinDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Join Organization</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <div className="space-y-6">
            {organizations.map((org) => (
              <Card key={org.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <CardTitle>{org.name}</CardTitle>
                    <Badge variant="outline" className="mt-2 sm:mt-0 w-fit">
                      {org.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{org.description}</p>
                  
                  <div className="flex flex-col sm:flex-row justify-between">
                    <div className="flex gap-4 mb-4 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{org.members} Members</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {org.projects} Projects
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/organizations/${org.id}/projects`}>
                          View Projects
                        </a>
                      </Button>
                      
                      {org.role === 'Admin' && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/organizations/${org.id}/settings`}>
                            <Settings className="h-4 w-4 mr-2" />
                            Manage
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {org.role === 'Admin' && (
                    <>
                      <Separator className="my-4" />
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Invitation Code</h3>
                        <div className="flex gap-2">
                          <Input value={`org-${org.id}-invite`} readOnly className="font-mono" />
                          <Button variant="outline">Copy</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Share this code with others to invite them to your organization
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Organizations;
