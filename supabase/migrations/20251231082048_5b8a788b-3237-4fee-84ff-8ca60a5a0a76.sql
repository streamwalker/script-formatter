-- Create style_history table for tracking recently used styles
CREATE TABLE public.style_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Style info
  style_id TEXT,
  is_mix BOOLEAN DEFAULT false NOT NULL,
  primary_style TEXT,
  secondary_style TEXT,
  primary_intensity INTEGER,
  secondary_intensity INTEGER,
  
  -- Usage tracking
  use_count INTEGER DEFAULT 1 NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.style_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own style history"
  ON public.style_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own style history"
  ON public.style_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own style history"
  ON public.style_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own style history"
  ON public.style_history FOR DELETE
  USING (auth.uid() = user_id);

-- Create custom_styles table for user-created styles
CREATE TABLE public.custom_styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Style definition
  name TEXT NOT NULL,
  description TEXT,
  prompt_modifier TEXT NOT NULL,
  preview_emoji TEXT DEFAULT '🎨',
  
  -- Optional base style to extend from
  base_style TEXT,
  
  CONSTRAINT name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 50)
);

-- Enable RLS
ALTER TABLE public.custom_styles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own custom styles"
  ON public.custom_styles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom styles"
  ON public.custom_styles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom styles"
  ON public.custom_styles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom styles"
  ON public.custom_styles FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_custom_styles_updated_at
  BEFORE UPDATE ON public.custom_styles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();