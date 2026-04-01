import { supabase } from '@/integrations/supabase/client';

export type ProjectRole = 'owner' | 'editor' | 'viewer' | 'commenter';

export interface Collaborator {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  invited_by: string | null;
  invited_email: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  user_email?: string;
}

export interface ProjectComment {
  id: string;
  project_id: string;
  panel_id: string | null;
  user_id: string;
  content: string;
  position_x: number | null;
  position_y: number | null;
  is_resolved: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  replies?: ProjectComment[];
}

export interface PresenceState {
  id: string;
  user_id: string;
  user_email: string;
  online_at: string;
  current_panel_id?: string;
}

// Invite a collaborator to a project
export async function inviteCollaborator(
  projectId: string,
  email: string,
  role: ProjectRole = 'viewer',
  projectTitle?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if already invited
    const { data: existing } = await supabase
      .from('project_collaborators')
      .select('*')
      .eq('project_id', projectId)
      .eq('invited_email', email)
      .maybeSingle();

    if (existing) {
      return { success: false, error: new Error('User already invited') };
    }

    const { error } = await supabase
      .from('project_collaborators')
      .insert({
        project_id: projectId,
        user_id: user.id, // Placeholder - will be updated when user accepts
        invited_email: email,
        role,
        invited_by: user.id,
      });

    if (error) throw error;

    // Send invitation email
    try {
      const inviteLink = `${window.location.origin}/?project=${projectId}`;
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'collaboration_invite',
          email: email,
          inviteDetails: {
            projectTitle: projectTitle || 'Untitled Comic',
            inviterEmail: user.email || 'A team member',
            role: role.charAt(0).toUpperCase() + role.slice(1),
            inviteLink,
          },
        },
      });
    } catch (emailErr) {
      console.warn('Failed to send invitation email:', emailErr);
      // Don't fail the invite if email fails
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

// Accept an invitation
export async function acceptInvitation(
  projectId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('project_collaborators')
      .update({
        user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('invited_email', user.email);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

// Get all collaborators for a project
export async function getProjectCollaborators(
  projectId: string
): Promise<{ collaborators: Collaborator[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('project_collaborators')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { 
      collaborators: (data || []) as unknown as Collaborator[], 
      error: null 
    };
  } catch (err) {
    return { collaborators: [], error: err as Error };
  }
}

// Remove a collaborator
export async function removeCollaborator(
  projectId: string,
  collaboratorId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('project_collaborators')
      .delete()
      .eq('id', collaboratorId)
      .eq('project_id', projectId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

// Update collaborator role
export async function updateCollaboratorRole(
  projectId: string,
  collaboratorId: string,
  role: ProjectRole
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('project_collaborators')
      .update({ role })
      .eq('id', collaboratorId)
      .eq('project_id', projectId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

// Subscribe to presence for a project
export function subscribeToPresence(
  projectId: string,
  userId: string,
  userEmail: string,
  onPresenceChange: (presence: PresenceState[]) => void
) {
  const channel = supabase.channel(`presence:${projectId}`);

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const presenceList: PresenceState[] = [];
      
      Object.entries(state).forEach(([key, value]) => {
        const presences = value as any[];
        presences.forEach(p => {
          presenceList.push({
            id: key,
            user_id: p.user_id,
            user_email: p.user_email,
            online_at: p.online_at,
            current_panel_id: p.current_panel_id,
          });
        });
      });
      
      onPresenceChange(presenceList);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          user_email: userEmail,
          online_at: new Date().toISOString(),
        });
      }
    });

  return {
    updateCurrentPanel: async (panelId: string) => {
      await channel.track({
        user_id: userId,
        user_email: userEmail,
        online_at: new Date().toISOString(),
        current_panel_id: panelId,
      });
    },
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// Add a comment to a project/panel
export async function addComment(
  projectId: string,
  content: string,
  panelId?: string,
  position?: { x: number; y: number },
  parentId?: string
): Promise<{ comment: ProjectComment | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('project_comments')
      .insert({
        project_id: projectId,
        panel_id: panelId || null,
        user_id: user.id,
        content,
        position_x: position?.x ?? null,
        position_y: position?.y ?? null,
        parent_id: parentId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { comment: data as unknown as ProjectComment, error: null };
  } catch (err) {
    return { comment: null, error: err as Error };
  }
}

// Get comments for a project
export async function getProjectComments(
  projectId: string,
  panelId?: string
): Promise<{ comments: ProjectComment[]; error: Error | null }> {
  try {
    let query = supabase
      .from('project_comments')
      .select('*')
      .eq('project_id', projectId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (panelId) {
      query = query.eq('panel_id', panelId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch replies for each comment
    const comments = data || [];
    for (const comment of comments) {
      const { data: replies } = await supabase
        .from('project_comments')
        .select('*')
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true });
      
      (comment as any).replies = replies || [];
    }

    return { comments: comments as unknown as ProjectComment[], error: null };
  } catch (err) {
    return { comments: [], error: err as Error };
  }
}

// Resolve/unresolve a comment
export async function toggleCommentResolved(
  commentId: string,
  resolved: boolean
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('project_comments')
      .update({ is_resolved: resolved })
      .eq('id', commentId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

// Delete a comment
export async function deleteComment(
  commentId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('project_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

// Subscribe to comments for real-time updates
export function subscribeToComments(
  projectId: string,
  onCommentChange: (payload: any) => void
) {
  const channel = supabase
    .channel(`comments:${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'project_comments',
        filter: `project_id=eq.${projectId}`,
      },
      onCommentChange
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
