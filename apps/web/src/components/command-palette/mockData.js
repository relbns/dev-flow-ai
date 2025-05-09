
// Mock data for demo purposes - in a real app this would come from your state/backend
export const projects = [
  { id: '1', name: 'API Development', organization: null },
  { id: '2', name: 'React Dashboard', organization: null },
  { id: '3', name: 'Mobile App', organization: { id: 'org1', name: 'Frontend Team' } },
  { id: '4', name: 'Database Migration', organization: { id: 'org2', name: 'Backend Engineers' } }
];

export const tasks = [
  { 
    id: '1', 
    title: 'Implement authentication middleware', 
    projectId: '1',
    projectName: 'API Development',
    status: 'inProgress',
    organization: null
  },
  { 
    id: '2', 
    title: 'Rate limiting', 
    projectId: '1',
    projectName: 'API Development',
    status: 'inProgress',
    organization: null
  },
  { 
    id: '3', 
    title: 'Project setup', 
    projectId: '1',
    projectName: 'API Development',
    status: 'completed',
    organization: null
  },
  { 
    id: '4', 
    title: 'Documentation', 
    projectId: '1',
    projectName: 'API Development',
    status: 'notStarted',
    organization: null
  },
  { 
    id: '5', 
    title: 'User interface mockups', 
    projectId: '3',
    projectName: 'Mobile App',
    status: 'inProgress',
    organization: { id: 'org1', name: 'Frontend Team' }
  }
];
