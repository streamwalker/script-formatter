-- Create table for saved comic projects
CREATE TABLE public.comic_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Comic',
  script_text TEXT NOT NULL,
  art_style TEXT NOT NULL DEFAULT 'western',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for saved comic pages within projects
CREATE TABLE public.comic_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.comic_projects(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  opening_narration TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for panels within pages
CREATE TABLE public.comic_panels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.comic_pages(id) ON DELETE CASCADE,
  panel_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  narration TEXT,
  dialogue TEXT,
  is_black_and_white BOOLEAN DEFAULT false,
  image_data TEXT, -- Base64 image data
  prompt_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comic_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comic_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comic_panels ENABLE ROW LEVEL SECURITY;

-- RLS policies for comic_projects
CREATE POLICY "Users can view their own projects" 
ON public.comic_projects 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects" 
ON public.comic_projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON public.comic_projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON public.comic_projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for comic_pages (via project ownership)
CREATE POLICY "Users can view pages of their projects" 
ON public.comic_pages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.comic_projects 
    WHERE id = comic_pages.project_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create pages in their projects" 
ON public.comic_pages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.comic_projects 
    WHERE id = comic_pages.project_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update pages in their projects" 
ON public.comic_pages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.comic_projects 
    WHERE id = comic_pages.project_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete pages in their projects" 
ON public.comic_pages 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.comic_projects 
    WHERE id = comic_pages.project_id 
    AND user_id = auth.uid()
  )
);

-- RLS policies for comic_panels (via page -> project ownership)
CREATE POLICY "Users can view panels of their pages" 
ON public.comic_panels 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.comic_pages cp
    JOIN public.comic_projects pr ON cp.project_id = pr.id
    WHERE cp.id = comic_panels.page_id 
    AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create panels in their pages" 
ON public.comic_panels 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.comic_pages cp
    JOIN public.comic_projects pr ON cp.project_id = pr.id
    WHERE cp.id = comic_panels.page_id 
    AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update panels in their pages" 
ON public.comic_panels 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.comic_pages cp
    JOIN public.comic_projects pr ON cp.project_id = pr.id
    WHERE cp.id = comic_panels.page_id 
    AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete panels in their pages" 
ON public.comic_panels 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.comic_pages cp
    JOIN public.comic_projects pr ON cp.project_id = pr.id
    WHERE cp.id = comic_panels.page_id 
    AND pr.user_id = auth.uid()
  )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comic_projects
CREATE TRIGGER update_comic_projects_updated_at
BEFORE UPDATE ON public.comic_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_comic_projects_user_id ON public.comic_projects(user_id);
CREATE INDEX idx_comic_pages_project_id ON public.comic_pages(project_id);
CREATE INDEX idx_comic_panels_page_id ON public.comic_panels(page_id);