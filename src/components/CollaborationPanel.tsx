import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { UserPlus, Trash2, Crown, Edit, Eye, MessageSquare, Loader2 } from 'lucide-react';
import {
  Collaborator,
  ProjectRole,
  inviteCollaborator,
  getProjectCollaborators,
  removeCollaborator,
  updateCollaboratorRole,
} from '@/lib/collaboration';

interface CollaborationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  isOwner: boolean;
  projectTitle?: string;
}

const ROLE_ICONS: Record<ProjectRole, React.ReactNode> = {
  owner: <Crown className="w-3 h-3" />,
  editor: <Edit className="w-3 h-3" />,
  commenter: <MessageSquare className="w-3 h-3" />,
  viewer: <Eye className="w-3 h-3" />,
};

const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  commenter: 'Commenter',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<ProjectRole, string> = {
  owner: 'bg-amber-500/20 text-amber-600',
  editor: 'bg-blue-500/20 text-blue-600',
  commenter: 'bg-green-500/20 text-green-600',
  viewer: 'bg-gray-500/20 text-gray-600',
};

export function CollaborationPanel({
  open,
  onOpenChange,
  projectId,
  isOwner,
  projectTitle,
}: CollaborationPanelProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('viewer');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      loadCollaborators();
    }
  }, [open, projectId]);

  const loadCollaborators = async () => {
    setLoading(true);
    const { collaborators: data, error } = await getProjectCollaborators(projectId);
    if (error) {
      toast.error('Failed to load collaborators');
    } else {
      setCollaborators(data);
    }
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsInviting(true);
    const { success, error } = await inviteCollaborator(projectId, inviteEmail, inviteRole, projectTitle);
    
    if (success) {
      toast.success(`Invitation email sent to ${inviteEmail}`);
      setInviteEmail('');
      loadCollaborators();
    } else {
      toast.error(error?.message || 'Failed to send invitation');
    }
    setIsInviting(false);
  };

  const handleRemove = async (collaboratorId: string, email?: string) => {
    const confirmed = window.confirm(`Remove ${email || 'this collaborator'} from the project?`);
    if (!confirmed) return;

    const { success, error } = await removeCollaborator(projectId, collaboratorId);
    
    if (success) {
      toast.success('Collaborator removed');
      loadCollaborators();
    } else {
      toast.error(error?.message || 'Failed to remove collaborator');
    }
  };

  const handleRoleChange = async (collaboratorId: string, newRole: ProjectRole) => {
    const { success, error } = await updateCollaboratorRole(projectId, collaboratorId, newRole);
    
    if (success) {
      toast.success('Role updated');
      loadCollaborators();
    } else {
      toast.error(error?.message || 'Failed to update role');
    }
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Project Collaborators
          </DialogTitle>
          <DialogDescription>
            Invite others to collaborate on this comic project.
          </DialogDescription>
        </DialogHeader>

        {/* Invite Form */}
        {isOwner && (
          <>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="email" className="sr-only">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isInviting}
                  />
                </div>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ProjectRole)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="commenter">Commenter</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleInvite} disabled={isInviting}>
                  {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
                </Button>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Collaborators List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No collaborators yet. Invite someone to get started!
            </p>
          ) : (
            collaborators.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(collab.invited_email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {collab.invited_email || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${ROLE_COLORS[collab.role]}`}
                      >
                        {ROLE_ICONS[collab.role]}
                        <span className="ml-1">{ROLE_LABELS[collab.role]}</span>
                      </Badge>
                      {!collab.accepted_at && (
                        <Badge variant="outline" className="text-xs">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {isOwner && collab.role !== 'owner' && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={collab.role}
                      onValueChange={(v) => handleRoleChange(collab.id, v as ProjectRole)}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="commenter">Commenter</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(collab.id, collab.invited_email || undefined)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Role Descriptions */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>Viewer:</strong> Can view the project</p>
          <p><strong>Commenter:</strong> Can view and add comments</p>
          <p><strong>Editor:</strong> Can edit panels and content</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
