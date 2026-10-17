import { Platform, Share } from 'react-native';
import { notify } from './alert';

// Einheitliche Teilen-Abstraktion: natives Share-Sheet auf iOS/Android,
// Web Share API (navigator.share) auf Web mit Zwischenablage-Fallback für
// Browser ohne Unterstützung (z.B. Desktop).
export async function shareText(message: string) {
  if (Platform.OS === 'web') {
    const nav = navigator as Navigator & { share?: (data: { text: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ text: message });
      } catch {
        // Nutzer hat den Share-Dialog abgebrochen - kein Fehler.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      notify('In die Zwischenablage kopiert');
    } catch {
      notify('Teilen nicht möglich', message);
    }
    return;
  }
  await Share.share({ message });
}
