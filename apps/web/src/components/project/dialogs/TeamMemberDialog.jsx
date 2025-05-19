// src/components/project/dialogs/TeamMemberDialog.jsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TeamMemberDialog = ({ 
  open, 
  onOpenChange, 
  isEditing,
  memberForm,
  setMemberForm,
  onSubmit,
  setIsEditing
}) => {
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Reset form when closing
      if (!newOpen && open) {
        setMemberForm({ name: '', role: 'Developer', avatar: '' });
        setIsEditing(false);
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Team Member' : 'Add Team Member'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="memberName">Name *</Label>
            <Input
              id="memberName"
              value={memberForm.name}
              onChange={(e) =>
                setMemberForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memberRole">Role</Label>
            <Select
              value={memberForm.role || 'Developer'}
              onValueChange={(value) =>
                setMemberForm((prev) => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger id="memberRole">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Project Lead">Project Lead</SelectItem>
                <SelectItem value="Developer">Developer</SelectItem>
                <SelectItem value="Designer">Designer</SelectItem>
                <SelectItem value="QA">QA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="memberAvatar">Avatar URL (Optional)</Label>
            <Input
              id="memberAvatar"
              value={memberForm.avatar || ''}
              onChange={(e) =>
                setMemberForm((prev) => ({ ...prev, avatar: e.target.value }))
              }
              placeholder="Enter avatar URL"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setIsEditing(false);
                setMemberForm({ name: '', role: 'Developer', avatar: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Update' : 'Add'} Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberDialog;