-- Create style_favorites table for saving favorite styles and mixes
CREATE TABLE public.style_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- For single styles
  style_id TEXT,
  
  -- For mixed styles
  is_mix BOOLEAN DEFAULT false NOT NULL,
  primary_style TEXT,
  secondary_style TEXT,
  primary_intensity INTEGER,
  secondary_intensity INTEGER,
  
  -- Metadata
  custom_name TEXT,
  
  CONSTRAINT valid_favorite CHECK (
    (is_mix = false AND style_id IS NOT NULL) OR
    (is_mix = true AND primary_style IS NOT NULL AND secondary_style IS NOT NULL)
  )
);

-- Enable Row-Level Security
ALTER TABLE public.style_favorites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own favorites"
  ON public.style_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON public.style_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites"
  ON public.style_favorites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.style_favorites FOR DELETE
  USING (auth.uid() = user_id);