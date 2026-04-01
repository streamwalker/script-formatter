/**
 * Generation Queue System
 * 
 * Manages background generation jobs for comic panels.
 */

import { supabase } from '@/integrations/supabase/client';

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface QueueJob {
  id: string;
  user_id: string;
  project_id?: string;
  status: QueueStatus;
  priority: number;
  script_text: string;
  art_style: string;
  character_context?: string;
  reference_images?: string[];
  labeled_images?: any[];
  consistency_config?: any;
  total_panels: number;
  completed_panels: number;
  failed_panels: number;
  generated_images?: Record<string, string>;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;
  notify_on_complete: boolean;
}

export interface QueueStats {
  pendingCount: number;
  processingCount: number;
  completedToday: number;
  averageWaitTime: number; // in milliseconds
  userPosition?: number;
}

export interface CreateJobInput {
  scriptText: string;
  artStyle: string;
  characterContext?: string;
  referenceImages?: string[];
  labeledImages?: any[];
  consistencyConfig?: any;
  totalPanels: number;
  priority?: number;
  notifyOnComplete?: boolean;
}

/**
 * Add a new job to the generation queue
 */
export async function addToQueue(input: CreateJobInput): Promise<{ job: QueueJob | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { job: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await (supabase
      .from('generation_queue' as any)
      .insert({
        user_id: user.id,
        status: 'pending',
        priority: input.priority ?? 5,
        script_text: input.scriptText,
        art_style: input.artStyle,
        character_context: input.characterContext,
        reference_images: input.referenceImages,
        labeled_images: input.labeledImages,
        consistency_config: input.consistencyConfig,
        total_panels: input.totalPanels,
        completed_panels: 0,
        failed_panels: 0,
        notify_on_complete: input.notifyOnComplete ?? true,
      })
      .select()
      .single() as any);

    if (error) {
      return { job: null, error: new Error(error.message) };
    }

    return { job: data as QueueJob, error: null };
  } catch (err) {
    return { job: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get all queue jobs for the current user
 */
export async function getUserQueueJobs(): Promise<{ jobs: QueueJob[]; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { jobs: [], error: new Error('Not authenticated') };
    }

    const { data, error } = await (supabase
      .from('generation_queue' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as any);

    if (error) {
      return { jobs: [], error: new Error(error.message) };
    }

    return { jobs: (data || []) as QueueJob[], error: null };
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get a specific job by ID
 */
export async function getQueueJob(jobId: string): Promise<{ job: QueueJob | null; error: Error | null }> {
  try {
    const { data, error } = await (supabase
      .from('generation_queue' as any)
      .select('*')
      .eq('id', jobId)
      .single() as any);

    if (error) {
      return { job: null, error: new Error(error.message) };
    }

    return { job: data as QueueJob, error: null };
  } catch (err) {
    return { job: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Cancel a pending or processing job
 */
export async function cancelJob(jobId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await (supabase
      .from('generation_queue' as any)
      .update({ status: 'cancelled' })
      .eq('id', jobId)
      .in('status', ['pending', 'processing']) as any);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Retry a failed job
 */
export async function retryJob(jobId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await (supabase
      .from('generation_queue' as any)
      .update({ 
        status: 'pending',
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq('id', jobId)
      .eq('status', 'failed') as any);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Update job priority
 */
export async function updateJobPriority(jobId: string, priority: number): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await (supabase
      .from('generation_queue' as any)
      .update({ priority })
      .eq('id', jobId)
      .eq('status', 'pending') as any);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{ stats: QueueStats | null; error: Error | null }> {
  try {
    // Simplified stats - just return defaults for now
    return {
      stats: {
        pendingCount: 0,
        processingCount: 0,
        completedToday: 0,
        averageWaitTime: 0,
        userPosition: undefined,
      },
      error: null,
    };
  } catch (err) {
    return { stats: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Subscribe to queue updates for a specific job
 */
export function subscribeToJobUpdates(
  jobId: string,
  onUpdate: (job: QueueJob) => void
): () => void {
  const channel = supabase
    .channel(`queue-job-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'generation_queue',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        onUpdate(payload.new as QueueJob);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to all queue updates for the current user
 */
export function subscribeToUserQueueUpdates(
  userId: string,
  onUpdate: (job: QueueJob, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
): () => void {
  const channel = supabase
    .channel(`user-queue-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'generation_queue',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const job = (eventType === 'DELETE' ? payload.old : payload.new) as QueueJob;
        onUpdate(job, eventType);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Format estimated completion time
 */
export function formatEstimatedTime(ms: number): string {
  if (ms < 60000) {
    return 'Less than a minute';
  }
  
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) {
    return `~${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `~${hours} hour${hours === 1 ? '' : 's'}`;
  }
  return `~${hours}h ${remainingMinutes}m`;
}
