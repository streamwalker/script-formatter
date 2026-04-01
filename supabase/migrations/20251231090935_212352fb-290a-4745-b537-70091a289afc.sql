-- Create generation_queue table for background job processing
CREATE TABLE public.generation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.comic_projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  script_text TEXT NOT NULL,
  art_style TEXT NOT NULL,
  character_context TEXT,
  reference_images JSONB DEFAULT '[]'::jsonb,
  labeled_images JSONB DEFAULT '[]'::jsonb,
  consistency_config JSONB,
  total_panels INTEGER NOT NULL DEFAULT 0,
  completed_panels INTEGER NOT NULL DEFAULT 0,
  failed_panels INTEGER NOT NULL DEFAULT 0,
  generated_images JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  notify_on_complete BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own queue jobs" 
ON public.generation_queue 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own queue jobs" 
ON public.generation_queue 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue jobs" 
ON public.generation_queue 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue jobs" 
ON public.generation_queue 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for efficient querying
CREATE INDEX idx_generation_queue_user_status ON public.generation_queue(user_id, status);
CREATE INDEX idx_generation_queue_status_priority ON public.generation_queue(status, priority DESC, created_at ASC);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_queue;