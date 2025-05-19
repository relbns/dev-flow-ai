// src/components/project/dialogs/StakeholderDialog.jsx
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

const StakeholderDialog = ({ 
  open, 
  onOpenChange, 
  isEditing,
  stakeholderForm,
  setStakeholderForm,
  onSubmit,
  setIsEditing
}) => {
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Reset form when closing
      if (!newOpen && open) {
        setStakeholderForm({ name: '', email: '', phone: '' });
        setIsEditing(false);
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Stakeholder' : 'Add Stakeholder'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={stakeholderForm.name}
              onChange={(e) =>
                setStakeholderForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="Enter name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={stakeholderForm.email}
              onChange={(e) =>
                setStakeholderForm((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
              placeholder="Enter email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={stakeholderForm.phone}
              onChange={(e) =>
                setStakeholderForm((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              placeholder="Enter phone number"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setIsEditing(false);
                setStakeholderForm({ name: '', email: '', phone: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Update' : 'Add'} Stakeholder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StakeholderDialog;