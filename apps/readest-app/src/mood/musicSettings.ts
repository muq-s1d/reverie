// Mood music settings, stored in Readest's settings file as `moodMusic`.
import type { EnvConfigType } from '@/services/environment';
import { saveSysSettings } from '@/helpers/settings';
import { useSettingsStore } from '@/store/settingsStore';
import { DEFAULT_MUSIC_SETTINGS, type MusicSettings } from './music';

// Destructured store read (not a selector) to match how Readest components read settings.
export const useMusicSettings = (): MusicSettings => {
  const { settings } = useSettingsStore();
  return { ...DEFAULT_MUSIC_SETTINGS, ...settings?.moodMusic };
};

export const saveMusicSettings = (envConfig: EnvConfigType, patch: Partial<MusicSettings>) => {
  const current = { ...DEFAULT_MUSIC_SETTINGS, ...useSettingsStore.getState().settings.moodMusic };
  return saveSysSettings(envConfig, 'moodMusic', { ...current, ...patch });
};
