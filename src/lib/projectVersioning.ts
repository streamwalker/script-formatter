import { supabase } from '@/integrations/supabase/client';
import { ParsedPage } from '@/lib/scriptParser';
import { LabeledReferenceImage } from '@/lib/scriptParser';
import { ConsistencyConfig } from '@/lib/characterConsistencyModel';

export interface ProjectSnapshot {
  script_text: string;
  art_style: string;
  pages: ParsedPage[];
  panel_images: Record<number, string>;
  character_context: string;
  consistency_config: ConsistencyConfig;
  labeled_images?: LabeledReferenceImage[];
  reference_images?: string[];
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  version_name: string | null;
  description: string | null;
  snapshot: ProjectSnapshot;
  created_at: string;
  is_auto_save: boolean;
}

export interface VersionDiff {
  scriptChanged: boolean;
  styleChanged: boolean;
  panelCountDiff: number;
  addedPanels: number[];
  removedPanels: number[];
  modifiedPanels: number[];
  imagesChanged: boolean;
}

export async function createVersion(
  projectId: string,
  snapshot: ProjectSnapshot,
  name?: string,
  description?: string,
  isAutoSave = false
): Promise<{ version: ProjectVersion | null; error: Error | null }> {
  try {
    // Get the next version number
    const { data: latestVersion } = await supabase
      .from('project_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

    // If it's an auto-save, clean up old auto-saves (keep last 5)
    if (isAutoSave) {
      const { data: autoSaves } = await supabase
        .from('project_versions')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_auto_save', true)
        .order('created_at', { ascending: false });

      if (autoSaves && autoSaves.length >= 5) {
        const toDelete = autoSaves.slice(4).map(v => v.id);
        await supabase
          .from('project_versions')
          .delete()
          .in('id', toDelete);
      }
    }

    const insertData = {
      project_id: projectId,
      version_number: nextVersionNumber,
      version_name: name || (isAutoSave ? `Auto-save ${new Date().toLocaleTimeString()}` : null),
      description: description || null,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      is_auto_save: isAutoSave,
    };

    const { data, error } = await supabase
      .from('project_versions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return { version: null, error: new Error(error.message) };
    }

    return { 
      version: {
        ...data,
        snapshot: data.snapshot as unknown as ProjectSnapshot,
      } as ProjectVersion, 
      error: null 
    };
  } catch (err) {
    return { version: null, error: err as Error };
  }
}

export async function getProjectVersions(
  projectId: string
): Promise<{ versions: ProjectVersion[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false });

    if (error) {
      return { versions: [], error: new Error(error.message) };
    }

    const versions = (data || []).map(v => ({
      ...v,
      snapshot: v.snapshot as unknown as ProjectSnapshot,
    })) as ProjectVersion[];

    return { versions, error: null };
  } catch (err) {
    return { versions: [], error: err as Error };
  }
}

export async function getVersion(
  versionId: string
): Promise<{ version: ProjectVersion | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) {
      return { version: null, error: new Error(error.message) };
    }

    return { 
      version: {
        ...data,
        snapshot: data.snapshot as unknown as ProjectSnapshot,
      } as ProjectVersion, 
      error: null 
    };
  } catch (err) {
    return { version: null, error: err as Error };
  }
}

export async function getLatestVersion(
  projectId: string
): Promise<{ version: ProjectVersion | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { version: null, error: new Error(error.message) };
    }

    if (!data) {
      return { version: null, error: null };
    }

    return { 
      version: {
        ...data,
        snapshot: data.snapshot as unknown as ProjectSnapshot,
      } as ProjectVersion, 
      error: null 
    };
  } catch (err) {
    return { version: null, error: err as Error };
  }
}

export async function deleteVersion(
  versionId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('project_versions')
      .delete()
      .eq('id', versionId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

export function compareVersions(v1: ProjectVersion, v2: ProjectVersion): VersionDiff {
  const snap1 = v1.snapshot;
  const snap2 = v2.snapshot;

  const scriptChanged = snap1.script_text !== snap2.script_text;
  const styleChanged = snap1.art_style !== snap2.art_style;

  const panelIds1 = new Set(snap1.pages.flatMap(p => p.panels.map(panel => panel.id)));
  const panelIds2 = new Set(snap2.pages.flatMap(p => p.panels.map(panel => panel.id)));

  const addedPanels = [...panelIds2].filter(id => !panelIds1.has(id));
  const removedPanels = [...panelIds1].filter(id => !panelIds2.has(id));

  // Check for modified panels (same ID but different content)
  const modifiedPanels: number[] = [];
  const imageIds1 = new Set(Object.keys(snap1.panel_images || {}).map(Number));
  const imageIds2 = new Set(Object.keys(snap2.panel_images || {}).map(Number));

  for (const id of panelIds1) {
    if (panelIds2.has(id)) {
      const img1 = snap1.panel_images?.[id];
      const img2 = snap2.panel_images?.[id];
      if (img1 !== img2) {
        modifiedPanels.push(id);
      }
    }
  }

  const imagesChanged = 
    imageIds1.size !== imageIds2.size ||
    [...imageIds1].some(id => !imageIds2.has(id)) ||
    modifiedPanels.length > 0;

  return {
    scriptChanged,
    styleChanged,
    panelCountDiff: panelIds2.size - panelIds1.size,
    addedPanels,
    removedPanels,
    modifiedPanels,
    imagesChanged,
  };
}

export async function autoSaveVersion(
  projectId: string,
  snapshot: ProjectSnapshot
): Promise<{ success: boolean; error: Error | null }> {
  const { version, error } = await createVersion(
    projectId,
    snapshot,
    undefined,
    undefined,
    true
  );

  return { success: !!version, error };
}
