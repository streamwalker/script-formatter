import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { MessageCircle, Send, Check, Trash2, Reply, Loader2 } from 'lucide-react';
import {
  ProjectComment,
  addComment,
  getProjectComments,
  toggleCommentResolved,
  deleteComment,
  subscribeToComments,
} from '@/lib/collaboration';

interface PanelCommentsProps {
  projectId: string;
  panelId: string;
  canComment: boolean;
  className?: string;
}

export function PanelComments({
  projectId,
  panelId,
  canComment,
  className = '',
}: PanelCommentsProps) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      loadComments();
    }
  }, [open, projectId, panelId]);

  useEffect(() => {
    if (!open) return;

    const subscription = subscribeToComments(projectId, () => {
      loadComments();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [open, projectId]);

  const loadComments = async () => {
    setLoading(true);
    const { comments: data, error } = await getProjectComments(projectId, panelId);
    if (!error) {
      setComments(data);
    }
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    const { comment, error } = await addComment(projectId, newComment, panelId);
    
    if (error) {
      toast.error('Failed to add comment');
    } else {
      setNewComment('');
      loadComments();
    }
    setSubmitting(false);
  };

  const handleReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    setSubmitting(true);
    const { error } = await addComment(projectId, replyText, panelId, undefined, parentId);
    
    if (error) {
      toast.error('Failed to add reply');
    } else {
      setReplyText('');
      setReplyTo(null);
      loadComments();
    }
    setSubmitting(false);
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    const { error } = await toggleCommentResolved(commentId, !resolved);
    if (!error) {
      loadComments();
    }
  };

  const handleDelete = async (commentId: string) => {
    const confirmed = window.confirm('Delete this comment?');
    if (!confirmed) return;

    const { error } = await deleteComment(commentId);
    if (!error) {
      loadComments();
    }
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const unresolvedCount = comments.filter(c => !c.is_resolved).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${className}`}
        >
          <MessageCircle className="w-4 h-4" />
          {unresolvedCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              variant="destructive"
            >
              {unresolvedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Panel Comments</h4>
          <p className="text-xs text-muted-foreground">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No comments yet
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-2 rounded-lg ${
                  comment.is_resolved ? 'bg-muted/30' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(comment.user_email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium truncate">
                        {comment.user_email || 'Unknown'}
                      </span>
                      {comment.is_resolved && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${comment.is_resolved ? 'text-muted-foreground' : ''}`}>
                      {comment.content}
                    </p>
                    
                    <div className="flex items-center gap-1 mt-1">
                      {canComment && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                          >
                            <Reply className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleResolve(comment.id, comment.is_resolved)}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive"
                            onClick={() => handleDelete(comment.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Reply input */}
                    {replyTo === comment.id && (
                      <div className="mt-2 flex gap-1">
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="text-xs h-16 resize-none"
                        />
                        <Button
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleReply(comment.id)}
                          disabled={submitting || !replyText.trim()}
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-2 pl-3 border-l-2 border-border space-y-1">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="text-xs">
                            <span className="font-medium">
                              {reply.user_email?.split('@')[0]}:
                            </span>{' '}
                            <span className="text-muted-foreground">
                              {reply.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* New Comment Input */}
        {canComment && (
          <>
            <Separator />
            <div className="p-2 flex gap-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="text-xs h-16 resize-none"
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleAddComment}
                disabled={submitting || !newComment.trim()}
              >
                {submitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
