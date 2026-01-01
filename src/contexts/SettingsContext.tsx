import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserSettings {
  soundEnabled: boolean;
  soundVolume: number;
  notificationsEnabled: boolean;
  achievementPopups: boolean;
  dailyReminders: boolean;
  focusModeAmbient: boolean;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
}

const defaultSettings: UserSettings = {
  soundEnabled: true,
  soundVolume: 0.3,
  notificationsEnabled: true,
  achievementPopups: true,
  dailyReminders: true,
  focusModeAmbient: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('user-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('user-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
