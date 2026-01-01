import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import {
  requestNotificationPermission,
  areNotificationsEnabled,
  getNotificationPreferences,
  saveNotificationPreferences,
  sendNotification,
} from "@/utils/notifications";
import { toast } from "sonner";

export const NotificationSettings = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(areNotificationsEnabled());
  const [preferences, setPreferences] = useState(getNotificationPreferences());

  useEffect(() => {
    setNotificationsEnabled(areNotificationsEnabled());
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      toast.success("Notifications enabled!");
      sendNotification("Notifications Enabled! 🔔", {
        body: "You'll now receive study reminders and goal updates.",
      });
    } else {
      toast.error("Notification permission denied. Please enable in browser settings.");
    }
  };

  const updatePreference = (key: keyof typeof preferences, value: any) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    saveNotificationPreferences(newPrefs);
  };

  const sendTestNotification = () => {
    if (areNotificationsEnabled()) {
      sendNotification("Test Notification 🧪", {
        body: "This is how your study reminders will appear!",
      });
      toast.success("Test notification sent!");
    } else {
      toast.error("Please enable notifications first");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Notifications */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {notificationsEnabled ? (
              <div className="p-2 rounded-lg bg-[hsl(var(--badge-success))]/10">
                <Bell className="h-5 w-5 text-[hsl(var(--badge-success))]" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-muted">
                <BellOff className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                {notificationsEnabled
                  ? "Notifications are enabled"
                  : "Enable to receive study reminders"}
              </p>
            </div>
          </div>
          {notificationsEnabled ? (
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--badge-success))]" />
          ) : (
            <Button onClick={handleEnableNotifications}>Enable</Button>
          )}
        </div>

        {/* Notification Preferences */}
        {notificationsEnabled && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Daily Goal Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded if you haven't met your daily goals
                </p>
              </div>
              <Switch
                checked={preferences.dailyReminders}
                onCheckedChange={(checked) => updatePreference("dailyReminders", checked)}
              />
            </div>

            {preferences.dailyReminders && (
              <div className="flex items-center gap-4 pl-4">
                <Label>Reminder Time:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={preferences.reminderHour}
                    onChange={(e) =>
                      updatePreference("reminderHour", parseInt(e.target.value) || 18)
                    }
                    className="w-20"
                  />
                  <span className="text-muted-foreground">:00</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Study Session Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when it's time for a break (Pomodoro)
                </p>
              </div>
              <Switch
                checked={preferences.studyReminders}
                onCheckedChange={(checked) => updatePreference("studyReminders", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Achievement Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Celebrate when you earn new achievements
                </p>
              </div>
              <Switch
                checked={preferences.achievementNotifications}
                onCheckedChange={(checked) =>
                  updatePreference("achievementNotifications", checked)
                }
              />
            </div>

            <Button variant="outline" onClick={sendTestNotification} className="w-full">
              Send Test Notification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
