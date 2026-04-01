import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Bell, Mail, CheckCircle, XCircle, Loader2, Send } from 'lucide-react';
import {
  NotificationPreferences,
  getUserPreferences,
  updateNotificationPreferences,
  sendTestNotification,
} from '@/lib/notifications';

interface NotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettings({ open, onOpenChange }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Form state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    setIsLoading(true);
    const { preferences, error } = await getUserPreferences();
    
    if (error) {
      toast.error('Failed to load notification preferences');
      console.error(error);
    } else if (preferences) {
      setPreferences(preferences);
      setEmailNotifications(preferences.email_notifications);
      setNotificationEmail(preferences.notification_email || '');
      setNotifyOnComplete(preferences.notify_on_complete);
      setNotifyOnFailure(preferences.notify_on_failure);
    }
    
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const { success, error } = await updateNotificationPreferences({
      email_notifications: emailNotifications,
      notification_email: notificationEmail || null,
      notify_on_complete: notifyOnComplete,
      notify_on_failure: notifyOnFailure,
    });
    
    if (success) {
      toast.success('Notification preferences saved');
      onOpenChange(false);
    } else {
      toast.error('Failed to save preferences');
      console.error(error);
    }
    
    setIsSaving(false);
  };

  const handleSendTest = async () => {
    if (!notificationEmail) {
      toast.error('Please enter an email address first');
      return;
    }
    
    setIsSendingTest(true);
    
    const { success, error } = await sendTestNotification();
    
    if (success) {
      toast.success('Test email sent! Check your inbox.');
    } else {
      toast.error('Failed to send test email');
      console.error(error);
    }
    
    setIsSendingTest(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notification Settings
          </DialogTitle>
          <DialogDescription>
            Configure how you want to be notified about your generation jobs.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your jobs
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            {emailNotifications && (
              <>
                {/* Email input */}
                <div className="space-y-2">
                  <Label htmlFor="email">Notification Email</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSendTest}
                      disabled={isSendingTest || !notificationEmail}
                      title="Send test email"
                    >
                      {isSendingTest ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use your account email
                  </p>
                </div>

                {/* Notification types */}
                <div className="space-y-4 pt-2 border-t">
                  <Label className="text-sm font-medium">Notify me when:</Label>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Job completes successfully</span>
                    </div>
                    <Switch
                      checked={notifyOnComplete}
                      onCheckedChange={setNotifyOnComplete}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-destructive" />
                      <span className="text-sm">Job fails or has errors</span>
                    </div>
                    <Switch
                      checked={notifyOnFailure}
                      onCheckedChange={setNotifyOnFailure}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Preferences'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
