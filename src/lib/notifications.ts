import { supabase } from '@/integrations/supabase/client';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  notification_email: string | null;
  notify_on_complete: boolean;
  notify_on_failure: boolean;
  created_at: string;
  updated_at: string;
}

export async function getUserPreferences(): Promise<{ preferences: NotificationPreferences | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { preferences: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return { preferences: null, error: new Error(error.message) };
    }

    // Return default preferences if none exist
    if (!data) {
      return {
        preferences: {
          id: '',
          user_id: user.id,
          email_notifications: true,
          notification_email: user.email || null,
          notify_on_complete: true,
          notify_on_failure: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      };
    }

    return { preferences: data as NotificationPreferences, error: null };
  } catch (err) {
    return { preferences: null, error: err as Error };
  }
}

export async function updateNotificationPreferences(
  preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: new Error('Not authenticated') };
    }

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('user_preferences')
        .update(preferences)
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          ...preferences,
        });

      if (error) {
        return { success: false, error: new Error(error.message) };
      }
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

export async function sendTestNotification(): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'test',
        jobId: 'test-job',
      },
    });

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}
