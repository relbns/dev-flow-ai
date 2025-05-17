import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient'; // Changed from supabase to apiClient
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast'; // Or your preferred toast library
import { Copy, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth to check authentication state

const ApiKeysSection = () => {
  const { user } = useAuth(); // Use the auth context
  const [apiKeys, setApiKeys] = useState([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [generatedApiKey, setGeneratedApiKey] = useState(null);
  const [isLoadingGenerate, setIsLoadingGenerate] = useState(false);
  const [error, setError] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    if (!user) {
      setError('Not authenticated');
      setIsLoadingKeys(false);
      return;
    }
    
    setIsLoadingKeys(true);
    setError('');
    try {
      // Use the apiClient directly
      const data = await apiClient.apiKeys.list();
      setApiKeys(data || []);
    } catch (err) {
      console.error("Error fetching API keys:", err);
      setError(err.message || 'Failed to fetch API keys.');
      toast({ title: "Error", description: err.message || 'Failed to fetch API keys.', variant: "destructive" });
    } finally {
      setIsLoadingKeys(false);
    }
  }, [user]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleGenerateKey = async () => {
    if (!user) {
      setError('Not authenticated');
      return;
    }
    
    setIsLoadingGenerate(true);
    setError('');
    setGeneratedApiKey(null);
    try {
      // Use apiClient to generate a key
      const data = await apiClient.apiKeys.generate(newApiKeyName.trim() || undefined);
      
      setGeneratedApiKey(data.apiKey);
      setNewApiKeyName(''); // Clear input
      fetchApiKeys(); // Refresh list
      toast({ title: "API Key Generated", description: "Your new API key has been generated. Copy it now!" });
    } catch (err) {
      console.error("Error generating API key:", err);
      setError(err.message || 'Failed to generate API key.');
      toast({ title: "Error", description: err.message || 'Failed to generate API key.', variant: "destructive" });
    } finally {
      setIsLoadingGenerate(false);
    }
  };

  const handleRevokeKey = async (apiKeyId) => {
    if (!user) {
      setError('Not authenticated');
      return;
    }
    
    setError('');
    try {
      // Use apiClient to delete a key
      await apiClient.apiKeys.delete(apiKeyId);
      
      fetchApiKeys(); // Refresh list
      toast({ title: "API Key Revoked", description: "The API key has been successfully revoked." });
    } catch (err) {
      console.error("Error revoking API key:", err);
      setError(err.message || 'Failed to revoke API key.');
      toast({ title: "Error", description: err.message || 'Failed to revoke API key.', variant: "destructive" });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      toast({ title: "Copied!", description: "API Key copied to clipboard." });
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({ title: "Error", description: "Failed to copy API key.", variant: "destructive" });
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate New API Key</CardTitle>
          <CardDescription>Create a new API key for external applications to access your DevFlow AI data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Key Name (e.g., Claude Desktop Key)"
            value={newApiKeyName}
            onChange={(e) => setNewApiKeyName(e.target.value)}
            disabled={isLoadingGenerate || !!generatedApiKey}
          />
          <Button onClick={handleGenerateKey} disabled={isLoadingGenerate || !!generatedApiKey}>
            {isLoadingGenerate ? 'Generating...' : 'Generate New API Key'}
          </Button>
          {generatedApiKey && (
            <Card className="mt-4 bg-secondary/50 p-4">
              <CardHeader>
                <CardTitle className="text-destructive">New API Key Generated!</CardTitle>
                <CardDescription className="text-destructive">
                  Please copy this key and store it securely. It will not be shown again.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Input type="text" value={generatedApiKey} readOnly className="font-mono flex-grow" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedApiKey)}>
                    {isCopied ? <Copy className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                 <Button variant="outline" onClick={() => setGeneratedApiKey(null)}>Done</Button>
              </CardFooter>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>Manage your existing API keys.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingKeys ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : apiKeys.length === 0 ? (
            <p>No API keys generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>{key.name || '-'}</TableCell>
                    <TableCell className="font-mono">{key.key_prefix}</TableCell>
                    <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to revoke this API key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This API key will immediately stop working.
                              Name: {key.name || 'Unnamed Key'} (Prefix: {key.key_prefix})
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevokeKey(key.id)} className="bg-destructive hover:bg-destructive/90">
                              Revoke Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default ApiKeysSection;