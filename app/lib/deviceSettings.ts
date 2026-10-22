import AsyncStorage from '@react-native-async-storage/async-storage';

// Generische Abstraktion für rein geräteweite Einstellungen (nicht
// haushaltsweit, nicht in Supabase) - z.B. gemerkte Ansichtswahl. Fehler
// werden bewusst verschluckt: eine Geräte-Einstellung, die nicht geladen/
// gespeichert werden kann, darf die App nie blockieren (fällt einfach auf
// den Default zurück).
const PREFIX = 'mealio:';

async function getDeviceSetting(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

async function setDeviceSetting(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, value);
  } catch {
    // Ignorieren, siehe oben.
  }
}

export type WeeklyPlanViewMode = 'list' | 'week';

export async function getWeeklyPlanViewMode(): Promise<WeeklyPlanViewMode> {
  const value = await getDeviceSetting('weeklyPlanViewMode');
  return value === 'week' ? 'week' : 'list';
}

export async function setWeeklyPlanViewMode(mode: WeeklyPlanViewMode): Promise<void> {
  await setDeviceSetting('weeklyPlanViewMode', mode);
}
