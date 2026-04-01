-- Create user_preferences table for notification settings
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_notifications boolean DEFAULT true,
  notification_email text,
  notify_on_complete boolean DEFAULT true,
  notify_on_failure boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Create project_versions table for versioning system
CREATE TABLE public.project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.comic_projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  version_name text,
  description text,
  snapshot jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_auto_save boolean DEFAULT false,
  UNIQUE(project_id, version_number)
);

-- Enable RLS
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_versions (through project ownership)
CREATE POLICY "Users can view versions of their projects"
ON public.project_versions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.comic_projects
  WHERE comic_projects.id = project_versions.project_id
  AND comic_projects.user_id = auth.uid()
));

CREATE POLICY "Users can create versions of their projects"
ON public.project_versions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.comic_projects
  WHERE comic_projects.id = project_versions.project_id
  AND comic_projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete versions of their projects"
ON public.project_versions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.comic_projects
  WHERE comic_projects.id = project_versions.project_id
  AND comic_projects.user_id = auth.uid()
));

-- Add notification_email column to generation_queue
ALTER TABLE public.generation_queue ADD COLUMN IF NOT EXISTS notification_email text;

-- Create trigger for user_preferences updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_project_versions_project_id ON public.project_versions(project_id);
CREATE INDEX idx_project_versions_created_at ON public.project_versions(created_at DESC);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);