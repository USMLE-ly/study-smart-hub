// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

// Check if notifications are supported and enabled
export const areNotificationsEnabled = (): boolean => {
  return "Notification" in window && Notification.permission === "granted";
};

// Send a notification
export const sendNotification = (title: string, options?: NotificationOptions): void => {
  if (areNotificationsEnabled()) {
    new Notification(title, {
      icon: "/favicon.ico",
      ...options,
    });
  }
};

// Schedule a daily reminder check
export const scheduleDailyGoalReminder = (goalChecker: () => boolean, reminderHour: number = 18): void => {
  const checkAndNotify = () => {
    const now = new Date();
    const currentHour = now.getHours();

    // Check if it's the reminder hour and goals are not met
    if (currentHour === reminderHour) {
      const goalsComplete = goalChecker();
      if (!goalsComplete && areNotificationsEnabled()) {
        sendNotification("Daily Study Goals Reminder 📚", {
          body: "You haven't completed your daily study goals yet. Keep studying to maintain your streak!",
          tag: "daily-goal-reminder",
          requireInteraction: true,
        });
      }
    }
  };

  // Check every hour
  setInterval(checkAndNotify, 60 * 60 * 1000);

  // Also check immediately if we're past the reminder hour
  const now = new Date();
  if (now.getHours() >= reminderHour) {
    checkAndNotify();
  }
};

// Notification preferences
export interface NotificationPreferences {
  dailyReminders: boolean;
  reminderHour: number;
  studyReminders: boolean;
  achievementNotifications: boolean;
}

export const getNotificationPreferences = (): NotificationPreferences => {
  const saved = localStorage.getItem("notificationPreferences");
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    dailyReminders: true,
    reminderHour: 18,
    studyReminders: true,
    achievementNotifications: true,
  };
};

export const saveNotificationPreferences = (prefs: NotificationPreferences): void => {
  localStorage.setItem("notificationPreferences", JSON.stringify(prefs));
};
