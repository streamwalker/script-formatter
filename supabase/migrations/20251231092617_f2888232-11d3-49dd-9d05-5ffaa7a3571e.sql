-- Create enum for project roles
CREATE TYPE public.project_role AS ENUM ('owner', 'editor', 'viewer', 'commenter');

-- Create project_collaborators table
CREATE TABLE public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES comic_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role project_role NOT NULL DEFAULT 'viewer',
  invited_by UUID,
  invited_email TEXT,
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create project_comments table
CREATE TABLE public.project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES comic_projects(id) ON DELETE CASCADE,
  panel_id TEXT,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  position_x DECIMAL,
  position_y DECIMAL,
  is_resolved BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES project_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check project access
CREATE OR REPLACE FUNCTION public.has_project_access(
  _project_id UUID, 
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = _project_id 
    AND user_id = _user_id
    AND accepted_at IS NOT NULL
  ) OR EXISTS (
    SELECT 1 FROM comic_projects
    WHERE id = _project_id AND user_id = _user_id
  )
$$;

-- Create function to check specific role access
CREATE OR REPLACE FUNCTION public.has_project_role(
  _project_id UUID, 
  _user_id UUID,
  _min_role project_role
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM comic_projects
    WHERE id = _project_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM project_collaborators
    WHERE project_id = _project_id 
    AND user_id = _user_id
    AND accepted_at IS NOT NULL
    AND (
      (_min_role = 'viewer') OR
      (_min_role = 'commenter' AND role IN ('commenter', 'editor', 'owner')) OR
      (_min_role = 'editor' AND role IN ('editor', 'owner')) OR
      (_min_role = 'owner' AND role = 'owner')
    )
  )
$$;

-- RLS policies for project_collaborators
CREATE POLICY "Users can view collaborators of their projects"
ON public.project_collaborators
FOR SELECT
USING (public.has_project_access(project_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Project owners can insert collaborators"
ON public.project_collaborators
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM comic_projects
    WHERE id = project_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can update collaborators"
ON public.project_collaborators
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM comic_projects
    WHERE id = project_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can delete collaborators"
ON public.project_collaborators
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM comic_projects
    WHERE id = project_id AND user_id = auth.uid()
  ) OR user_id = auth.uid()
);

-- RLS policies for project_comments
CREATE POLICY "Users can view comments on accessible projects"
ON public.project_comments
FOR SELECT
USING (public.has_project_access(project_id, auth.uid()));

CREATE POLICY "Users with commenter+ role can insert comments"
ON public.project_comments
FOR INSERT
WITH CHECK (public.has_project_role(project_id, auth.uid(), 'commenter'));

CREATE POLICY "Users can update their own comments"
ON public.project_comments
FOR UPDATE
USING (user_id = auth.uid() OR public.has_project_role(project_id, auth.uid(), 'editor'));

CREATE POLICY "Users can delete their own comments"
ON public.project_comments
FOR DELETE
USING (user_id = auth.uid() OR public.has_project_role(project_id, auth.uid(), 'editor'));

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE project_collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE project_comments;

-- Add indexes for performance
CREATE INDEX idx_project_collaborators_project_id ON public.project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_user_id ON public.project_collaborators(user_id);
CREATE INDEX idx_project_comments_project_id ON public.project_comments(project_id);
CREATE INDEX idx_project_comments_panel_id ON public.project_comments(panel_id);

-- Create trigger for updated_at on project_comments
CREATE TRIGGER update_project_comments_updated_at
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();