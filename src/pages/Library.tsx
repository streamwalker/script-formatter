import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Library, Plus, Trash2, Clock, ArrowLeft, Loader2, FileText } from 'lucide-react';
import { ArtStyle } from '@/lib/artStyles';

interface ComicProject {
  id: string;
  title: string;
  script_text: string;
  art_style: ArtStyle;
  created_at: string;
  updated_at: string;
}

interface ScriptDraft {
  id: string;
  title: string;
  content: string;
  format: string;
  version_label: string;
  created_at: string;
  updated_at: string;
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ComicProject[]>([]);
  const [drafts, setDrafts] = useState<ScriptDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [projectsRes, draftsRes] = await Promise.all([
        supabase.from('comic_projects').select('*').order('updated_at', { ascending: false }),
        supabase.from('script_drafts').select('*').order('updated_at', { ascending: false }),
      ]);

      if (projectsRes.error) throw projectsRes.error;
      setProjects((projectsRes.data || []) as ComicProject[]);

      if (draftsRes.error) throw draftsRes.error;
      setDrafts((draftsRes.data || []) as ScriptDraft[]);
    } catch (error: any) {
      console.error('Error fetching library:', error);
      toast.error('Failed to load library');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('comic_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project deleted');
    } catch (error: any) {
      toast.error('Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };

  const deleteDraft = async (id: string) => {
    setDeletingDraftId(id);
    try {
      const { error } = await supabase
        .from('script_drafts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDrafts(prev => prev.filter(d => d.id !== id));
      toast.success('Script draft deleted');
    } catch (error: any) {
      toast.error('Failed to delete draft');
    } finally {
      setDeletingDraftId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isEmpty = projects.length === 0 && drafts.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <h1 className="font-comic text-3xl text-foreground flex items-center gap-3">
              <Library className="w-8 h-8 text-primary" />
              My Library
            </h1>
          </div>
          <Button variant="hero" onClick={() => navigate('/')}>
            <Plus className="w-4 h-4 mr-1" />
            New Comic
          </Button>
        </div>
      </header>

      <main className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isEmpty ? (
          <div className="text-center py-20">
            <Library className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium text-foreground mb-2">No saved work yet</h2>
            <p className="text-muted-foreground mb-6">
              Create a comic or format a script to see it here
            </p>
            <Button variant="hero" onClick={() => navigate('/')}>
              <Plus className="w-4 h-4 mr-1" />
              Get Started
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Comic Projects */}
            {projects.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Comics</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-foreground truncate flex-1 mr-2">
                          {project.title}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProject(project.id)}
                          disabled={deletingId === project.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        >
                          {deletingId === project.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {project.script_text.substring(0, 150)}...
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="px-2 py-1 bg-secondary rounded capitalize">
                          {project.art_style}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(project.updated_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Script Drafts */}
            {drafts.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Scripts</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      onClick={() => navigate(`/script-formatter/${draft.id}`)}
                      className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <h3 className="font-semibold text-foreground truncate">
                            {draft.title}
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deleteDraft(draft.id); }}
                          disabled={deletingDraftId === draft.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        >
                          {deletingDraftId === draft.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {draft.content.substring(0, 150) || 'Empty draft'}
                        {draft.content.length > 150 ? '...' : ''}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-secondary rounded capitalize">
                            {draft.format.replace('-', ' ')}
                          </span>
                          <span className="font-mono">{draft.version_label}</span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(draft.updated_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
