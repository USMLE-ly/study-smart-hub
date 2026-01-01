import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Volume2, 
  VolumeX, 
  Bell, 
  BellOff, 
  Award, 
  Music, 
  Clock,
  Save,
  RotateCcw
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { toast } from "sonner";

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const { playTaskComplete } = useSoundEffects({ 
    volume: settings.soundVolume, 
    enabled: settings.soundEnabled 
  });

  const handleVolumeChange = (value: number[]) => {
    updateSettings({ soundVolume: value[0] });
  };

  const testSound = () => {
    playTaskComplete();
    toast.success("Sound test played!");
  };

  const resetToDefaults = () => {
    updateSettings({
      soundEnabled: true,
      soundVolume: 0.3,
      notificationsEnabled: true,
      achievementPopups: true,
      dailyReminders: true,
      focusModeAmbient: true,
    });
    toast.success("Settings reset to defaults");
  };

  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testSound}
                disabled={!settings.soundEnabled}
              >
                Test Sound
              </Button>
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
