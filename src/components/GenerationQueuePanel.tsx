import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Pause,
  RotateCcw,
  Trash2,
  ChevronUp,
  ChevronDown,
  ListOrdered,
  Eye,
} from 'lucide-react';
import {
  QueueJob,
  QueueStats,
  QueueStatus,
  getUserQueueJobs,
  getQueueStats,
  cancelJob,
  retryJob,
  updateJobPriority,
  subscribeToUserQueueUpdates,
  formatEstimatedTime,
} from '@/lib/generationQueue';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GenerationQueuePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewResults: (job: QueueJob) => void;
}

export function GenerationQueuePanel({
  open,
  onOpenChange,
  onViewResults,
}: GenerationQueuePanelProps) {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }

      const [jobsResult, statsResult] = await Promise.all([
        getUserQueueJobs(),
        getQueueStats(),
      ]);

      if (jobsResult.jobs) {
        setJobs(jobsResult.jobs);
      }
      if (statsResult.stats) {
        setStats(statsResult.stats);
      }

      setIsLoading(false);
    };

    loadData();
  }, [open]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId || !open) return;

    const unsubscribe = subscribeToUserQueueUpdates(userId, (job, eventType) => {
      setJobs(prev => {
        if (eventType === 'INSERT') {
          return [job, ...prev];
        }
        if (eventType === 'DELETE') {
          return prev.filter(j => j.id !== job.id);
        }
        return prev.map(j => (j.id === job.id ? job : j));
      });

      // Show notification for completed jobs
      if (eventType === 'UPDATE' && job.status === 'completed') {
        toast.success(`Generation job completed! (${job.completed_panels}/${job.total_panels} panels)`);
      }
      if (eventType === 'UPDATE' && job.status === 'failed') {
        toast.error(`Generation job failed: ${job.error_message || 'Unknown error'}`);
      }
    });

    return unsubscribe;
  }, [userId, open]);

  const handleCancel = async (jobId: string) => {
    const { success, error } = await cancelJob(jobId);
    if (success) {
      toast.success('Job cancelled');
    } else {
      toast.error(`Failed to cancel: ${error?.message}`);
    }
  };

  const handleRetry = async (jobId: string) => {
    const { success, error } = await retryJob(jobId);
    if (success) {
      toast.success('Job requeued');
    } else {
      toast.error(`Failed to retry: ${error?.message}`);
    }
  };

  const handlePriorityChange = async (jobId: string, currentPriority: number, direction: 'up' | 'down') => {
    const newPriority = direction === 'up' ? currentPriority + 1 : currentPriority - 1;
    if (newPriority < 1 || newPriority > 10) return;

    const { success, error } = await updateJobPriority(jobId, newPriority);
    if (success) {
      setJobs(prev => 
        prev.map(j => (j.id === jobId ? { ...j, priority: newPriority } : j))
      );
    } else {
      toast.error(`Failed to update priority: ${error?.message}`);
    }
  };

  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'processing':
        return <Badge className="gap-1 bg-blue-500"><Loader2 className="h-3 w-3 animate-spin" /> Processing</Badge>;
      case 'completed':
        return <Badge className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="gap-1"><Pause className="h-3 w-3" /> Cancelled</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
  const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-primary" />
            Generation Queue
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Overview */}
              {stats && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-primary">{activeJobs.length}</div>
                    <div className="text-xs text-muted-foreground">Active Jobs</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-green-500">{completedJobs.filter(j => j.status === 'completed').length}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-destructive">{completedJobs.filter(j => j.status === 'failed').length}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-lg font-bold">{formatEstimatedTime(stats.averageWaitTime)}</div>
                    <div className="text-xs text-muted-foreground">Avg Wait</div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Active Jobs */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Active Jobs ({activeJobs.length})</h3>
                
                {activeJobs.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    No active jobs in queue
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeJobs.map((job) => (
                      <div key={job.id} className="p-3 rounded-lg border border-border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(job.status)}
                            <span className="text-xs text-muted-foreground">
                              Priority: {job.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {job.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handlePriorityChange(job.id, job.priority, 'up')}
                                  disabled={job.priority >= 10}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handlePriorityChange(job.id, job.priority, 'down')}
                                  disabled={job.priority <= 1}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleCancel(job.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="text-sm mb-2">
                          <span className="font-medium">{job.art_style}</span> • {job.total_panels} panels
                        </div>

                        {job.status === 'processing' && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{job.completed_panels}/{job.total_panels} panels</span>
                              <span>{Math.round((job.completed_panels / job.total_panels) * 100)}%</span>
                            </div>
                            <Progress value={(job.completed_panels / job.total_panels) * 100} className="h-1.5" />
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground mt-2">
                          Created: {formatDate(job.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Completed Jobs */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">History ({completedJobs.length})</h3>
                
                {completedJobs.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    No completed jobs yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {completedJobs.slice(0, 10).map((job) => (
                      <div key={job.id} className="p-3 rounded-lg border border-border bg-card/50">
                        <div className="flex items-center justify-between mb-2">
                          {getStatusBadge(job.status)}
                          <div className="flex items-center gap-1">
                            {job.status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => onViewResults(job)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Results
                              </Button>
                            )}
                            {job.status === 'failed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleRetry(job.id)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Retry
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="text-sm mb-1">
                          <span className="font-medium">{job.art_style}</span> • 
                          {job.status === 'completed' 
                            ? ` ${job.completed_panels}/${job.total_panels} panels` 
                            : job.status === 'failed'
                            ? ` Failed: ${job.error_message || 'Unknown error'}`
                            : ' Cancelled'}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {job.completed_at ? `Completed: ${formatDate(job.completed_at)}` : `Created: ${formatDate(job.created_at)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
