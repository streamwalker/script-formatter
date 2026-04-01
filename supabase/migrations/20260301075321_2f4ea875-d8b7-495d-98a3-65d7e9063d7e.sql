
CREATE TABLE public.script_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Script',
  version_label text NOT NULL DEFAULT 'v1',
  content text NOT NULL DEFAULT '',
  format text NOT NULL DEFAULT 'graphic-novel',
  formatted_result text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.script_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own drafts" ON public.script_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own drafts" ON public.script_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own drafts" ON public.script_drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own drafts" ON public.script_drafts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_script_drafts_updated_at
  BEFORE UPDATE ON public.script_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
