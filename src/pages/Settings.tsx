import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Volume2, 
  VolumeX, 
  Bell, 
  BellOff, 
  Award, 
  Music, 
  Clock,
  RotateCcw,
  Mail,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSettings, SoundTone } from "@/contexts/SettingsContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const soundToneOptions: { value: SoundTone; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Classic ascending chime' },
  { value: 'soft', label: 'Soft', description: 'Gentle and calming tones' },
  { value: 'chime', label: 'Chime', description: 'High-pitched bell sounds' },
  { value: 'retro', label: 'Retro', description: '8-bit game style sounds' },
  { value: 'nature', label: 'Nature', description: 'Organic, flowing sounds' },
  { value: 'piano', label: 'Piano', description: 'Warm piano key tones' },
  { value: 'bells', label: 'Bells', description: 'Crystal clear bell sounds' },
  { value: 'gaming', label: 'Gaming', description: 'Energetic arcade style' },
];

const dayOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  
  const { playTaskComplete, playAchievement } = useSoundEffects({ 
    volume: settings.soundVolume, 
    enabled: settings.soundEnabled,
    tone: settings.soundTone,
  });

  const handleVolumeChange = (value: number[]) => {
    updateSettings({ soundVolume: value[0] });
  };

  const handleToneChange = (tone: SoundTone) => {
    updateSettings({ soundTone: tone });
    // Play a preview of the new tone
    setTimeout(() => playTaskComplete(), 100);
  };

  const testSound = () => {
    playTaskComplete();
    toast.success("Sound test played!");
  };

  const testAchievementSound = () => {
    playAchievement();
    toast.success("Achievement sound played!");
  };

  const handleWeeklyEmailToggle = async (enabled: boolean) => {
    updateSettings({ weeklyEmailEnabled: enabled });
    
    if (user && profile) {
      setSavingEmail(true);
      try {
        await updateProfile({ 
          weekly_email_enabled: enabled,
          weekly_email_day: settings.weeklyEmailDay,
        });
        toast.success(enabled ? "Weekly email enabled" : "Weekly email disabled");
      } catch (error) {
        console.error("Error updating email preference:", error);
        toast.error("Failed to update email preference");
      } finally {
        setSavingEmail(false);
      }
    }
  };

  const handleEmailDayChange = async (day: string) => {
    const dayNum = parseInt(day);
    updateSettings({ weeklyEmailDay: dayNum });
    
    if (user && profile && settings.weeklyEmailEnabled) {
      try {
        await updateProfile({ weekly_email_day: dayNum });
        toast.success(`Weekly email will be sent on ${dayOptions[dayNum].label}`);
      } catch (error) {
        console.error("Error updating email day:", error);
        toast.error("Failed to update email day");
      }
    }
  };

  const sendTestEmail = async () => {
    if (!user) {
      toast.error("Please log in to send a test email");
      return;
    }

    setTestingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-weekly-summary', {
        body: { userId: user.id },
      });

      if (error) throw error;

      if (data.sent > 0) {
        toast.success("Test email sent! Check your inbox.");
      } else {
        toast.error("Failed to send email. Make sure your profile has an email address.");
      }
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast.error("Failed to send test email: " + (error.message || "Unknown error"));
    } finally {
      setTestingEmail(false);
    }
  };

  const resetToDefaults = () => {
    updateSettings({
      soundEnabled: true,
      soundVolume: 0.3,
      soundTone: 'default',
      notificationsEnabled: true,
      achievementPopups: true,
      dailyReminders: true,
      focusModeAmbient: true,
      weeklyEmailEnabled: false,
      weeklyEmailDay: 0,
    });
    toast.success("Settings reset to defaults");
  };

  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : theme === 'light' ? (
                <Sun className="h-5 w-5 text-primary" />
              ) : (
                <Monitor className="h-5 w-5 text-primary" />
              )}
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-sm">Light</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-sm">Dark</span>
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-sm">System</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme. Dark mode is great for studying at night.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sound Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings.soundEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
              Sound Settings
            </CardTitle>
            <CardDescription>
              Configure audio feedback for actions and achievements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-enabled">Enable Sounds</Label>
                <p className="text-sm text-muted-foreground">
                  Play sounds for task completion and achievements
                </p>
              </div>
              <Switch
                id="sound-enabled"
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
              />
            </div>

            <Separator />

            {/* Volume Control */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Volume</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(settings.soundVolume * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.soundVolume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.1}
                disabled={!settings.soundEnabled}
                className="w-full"
              />
            </div>

            <Separator />

            {/* Sound Tone Selector */}
            <div className="space-y-3">
              <Label>Sound Tone</Label>
              <Select 
                value={settings.soundTone} 
                onValueChange={handleToneChange}
                disabled={!settings.soundEnabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a tone" />
                </SelectTrigger>
                <SelectContent>
                  {soundToneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testSound}
                  disabled={!settings.soundEnabled}
                >
                  Test Task Sound
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testAchievementSound}
                  disabled={!settings.soundEnabled}
                >
                  Test Achievement
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ambient-sound" className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Focus Mode Ambient
                </Label>
                <p className="text-sm text-muted-foreground">
                  Play ambient sounds during focus sessions
                </p>
              </div>
              <Switch
                id="ambient-sound"
                checked={settings.focusModeAmbient}
                onCheckedChange={(checked) => updateSettings({ focusModeAmbient: checked })}
                disabled={!settings.soundEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Receive weekly study summaries via email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-email">Weekly Study Summary</Label>
                <p className="text-sm text-muted-foreground">
                  Get a summary of your study progress each week
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savingEmail && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  id="weekly-email"
                  checked={settings.weeklyEmailEnabled}
                  onCheckedChange={handleWeeklyEmailToggle}
                />
              </div>
            </div>

            {settings.weeklyEmailEnabled && (
              <>
                <Separator />
                
                <div className="space-y-3">
                  <Label>Send On</Label>
                  <Select 
                    value={settings.weeklyEmailDay.toString()} 
                    onValueChange={handleEmailDayChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a day" />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={sendTestEmail}
                    disabled={testingEmail || !user}
                    className="gap-2"
                  >
                    {testingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Send Test Email
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Send a test email to verify your settings
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Push Notification Settings */}
        <NotificationSettings />

        {/* In-App Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings.notificationsEnabled ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              In-App Notifications
            </CardTitle>
            <CardDescription>
              Manage how you receive in-app notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications-enabled">Enable In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show toast notifications for events
                </p>
              </div>
              <Switch
                id="notifications-enabled"
                checked={settings.notificationsEnabled}
                onCheckedChange={(checked) => updateSettings({ notificationsEnabled: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="achievement-popups" className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Achievement Popups
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show animated popups when unlocking achievements
                </p>
              </div>
              <Switch
                id="achievement-popups"
                checked={settings.achievementPopups}
                onCheckedChange={(checked) => updateSettings({ achievementPopups: checked })}
                disabled={!settings.notificationsEnabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="daily-reminders" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Daily Study Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded about pending study tasks
                </p>
              </div>
              <Switch
                id="daily-reminders"
                checked={settings.dailyReminders}
                onCheckedChange={(checked) => updateSettings({ dailyReminders: checked })}
                disabled={!settings.notificationsEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
