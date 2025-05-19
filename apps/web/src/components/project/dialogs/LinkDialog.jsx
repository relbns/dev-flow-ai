// src/components/project/dialogs/LinkDialog.jsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const LinkDialog = ({ 
  open, 
  onOpenChange, 
  isEditing,
  linkForm,
  setLinkForm,
  onSubmit,
  setIsEditing
}) => {
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Reset form when closing
      if (!newOpen && open) {
        setLinkForm({ title: '', url: '', id: '' });
        setIsEditing(false);
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Link' : 'Add Link'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={linkForm.title}
              onChange={(e) =>
                setLinkForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={linkForm.url}
              onChange={(e) =>
                setLinkForm((prev) => ({ ...prev, url: e.target.value }))
              }
              placeholder="Enter URL"
              required
            />
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setIsEditing(false);
                setLinkForm({ title: '', url: '', id: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Update' : 'Add'} Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LinkDialog;