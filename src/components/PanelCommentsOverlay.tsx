import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Plus, Check, Trash2, Reply, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  ProjectComment,
  addComment,
  getProjectComments,
  toggleCommentResolved,
  deleteComment,
  subscribeToComments,
} from '@/lib/collaboration';

interface PanelCommentsOverlayProps {
  projectId: string;
  panelId: string;
  canComment: boolean;
}

export function PanelCommentsOverlay({
  projectId,
  panelId,
  canComment,
}: PanelCommentsOverlayProps) {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  const loadComments = async () => {
    const { comments: data, error } = await getProjectComments(projectId, panelId);
    if (!error) {
      setComments(data.filter(c => c.position_x !== null && c.position_y !== null));
    }
  };

  useEffect(() => {
    loadComments();
    const subscription = subscribeToComments(projectId, () => loadComments());
    return () => subscription.unsubscribe();
  }, [projectId, panelId]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!canComment || !isAddingComment) return;
    
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setNewCommentPosition({ x, y });
    setIsAddingComment(false);
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !newCommentPosition) return;
    
    const { comment, error } = await addComment(
      projectId,
      newCommentText,
      panelId,
      newCommentPosition
    );
    
    if (error) {
      toast.error('Failed to add comment');
    } else {
      toast.success('Comment added');
      setNewCommentText('');
      setNewCommentPosition(null);
      loadComments();
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    
    const { error } = await addComment(projectId, replyText, panelId, undefined, parentId);
    
    if (error) {
      toast.error('Failed to add reply');
    } else {
      toast.success('Reply added');
      setReplyText('');
      setReplyingTo(null);
      loadComments();
    }
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    const { error } = await toggleCommentResolved(commentId, resolved);
    if (error) {
      toast.error('Failed to update comment');
    } else {
      loadComments();
    }
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await deleteComment(commentId);
    if (error) {
      toast.error('Failed to delete comment');
    } else {
      loadComments();
    }
  };

  return (
    <div 
      ref={overlayRef}
      className="absolute inset-0"
      onClick={handleOverlayClick}
    >
      {/* Add Comment Mode Indicator */}
      {isAddingComment && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary cursor-crosshair z-30" />
      )}

      {/* Comment Markers */}
      {comments.map((comment) => (
        <Popover key={comment.id}>
          <PopoverTrigger asChild>
            <button
              className={`absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all hover:scale-110 z-20 ${
                comment.is_resolved 
                  ? 'bg-green-500 text-white' 
                  : 'bg-primary text-primary-foreground'
              }`}
              style={{
                left: `${comment.position_x}%`,
                top: `${comment.position_y}%`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm">{comment.content}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{comment.user_email?.split('@')[0] || 'User'}</span>
                  {comment.is_resolved && (
                    <Badge variant="outline" className="text-green-600">Resolved</Badge>
                  )}
                </div>
              </div>
              
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-3 border-l-2 border-muted space-y-2">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="text-sm">
                      <p>{reply.content}</p>
                      <span className="text-xs text-muted-foreground">
                        {reply.user_email?.split('@')[0] || 'User'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Reply Input */}
              {replyingTo === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => handleReply(comment.id)}>
                      Send
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1">
                  {canComment && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyingTo(comment.id)}
                      >
                        <Reply className="w-3 h-3 mr-1" />
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolve(comment.id, !comment.is_resolved)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {comment.is_resolved ? 'Unresolve' : 'Resolve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      ))}

      {/* New Comment Input */}
      {newCommentPosition && (
        <div
          className="absolute z-30"
          style={{
            left: `${newCommentPosition.x}%`,
            top: `${newCommentPosition.y}%`,
            transform: 'translate(-50%, 0)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-card border rounded-lg shadow-lg p-3 min-w-[200px]">
            <Textarea
              placeholder="Add a comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="min-h-[60px] text-sm mb-2"
              autoFocus
            />
            <div className="flex gap-1">
              <Button size="sm" onClick={handleAddComment}>
                Add
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setNewCommentPosition(null);
                  setNewCommentText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Add Comment Mode Button */}
      {canComment && !newCommentPosition && (
        <Button
          variant={isAddingComment ? "default" : "outline"}
          size="sm"
          className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsAddingComment(!isAddingComment);
          }}
        >
          {isAddingComment ? (
            <>
              <X className="w-3 h-3 mr-1" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-3 h-3 mr-1" />
              Comment
            </>
          )}
        </Button>
      )}
    </div>
  );
}
