import { BaseDirectory, readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';

const SAVE_FILE = 'BeastieBuddy_save.json';

export async function loadSaveData() {
  const defaultData = { beasts: [], spells: [], settings: { opacity: "1.0", pinned: false, theme: "light" } };
  try {
    const hasSave = await exists(SAVE_FILE, { baseDir: BaseDirectory.AppLocalData });
    if (!hasSave) return defaultData;
    
    const data = await readTextFile(SAVE_FILE, { baseDir: BaseDirectory.AppLocalData });
    const parsed = JSON.parse(data);
    return { ...defaultData, ...parsed, settings: { ...defaultData.settings, ...(parsed.settings || {}) } };
  } catch (err) {
    return defaultData;
  }
}

export async function saveSaveData(beasts: string[], spells: number[]) {
  try {
    const data = await loadSaveData();
    data.beasts = beasts;
    data.spells = spells;
    
    const dirExists = await exists('', { baseDir: BaseDirectory.AppLocalData });
    if (!dirExists) {
      await mkdir('', { baseDir: BaseDirectory.AppLocalData });
    }
    await writeTextFile(SAVE_FILE, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.AppLocalData });
  } catch (err) {
    console.error('Save failed', err);
  }
}

export async function saveSettingsData(settings: { opacity: string, pinned: boolean, theme: string }) {
  try {
    const data = await loadSaveData();
    data.settings = settings;
    
    const dirExists = await exists('', { baseDir: BaseDirectory.AppLocalData });
    if (!dirExists) {
      await mkdir('', { baseDir: BaseDirectory.AppLocalData });
    }
    await writeTextFile(SAVE_FILE, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.AppLocalData });
  } catch (err) {
    console.error('Save failed', err);
  }
}