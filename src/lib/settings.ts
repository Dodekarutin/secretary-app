const STORAGE_KEY = "secretary.settings";

export type AppSettings = {
  geminiApiKey?: string;
  geminiModel?: string;
  openaiApiKey?: string;
  currentProjectId?: string;
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AppSettings;
  } catch {
    return {};
  }
}

export function updateSettings(patch: Partial<AppSettings>) {
  const prev = getSettings();
  const next = { ...prev, ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearSetting<K extends keyof AppSettings>(key: K) {
  const prev = getSettings();
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete (prev as any)[key];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
}

export function setCurrentProjectId(id: string) {
  updateSettings({ currentProjectId: id });
}

export function getCurrentProjectId(): string | undefined {
  return getSettings().currentProjectId;
}
