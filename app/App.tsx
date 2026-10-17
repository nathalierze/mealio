import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
// Direkte Subpfad-Imports statt des Barrel-Exports der Pakete: der Barrel
// lädt beim Import alle ~20 Gewichtsvarianten (auch ungenutzte), das bläht
// den Web-Bundle unnötig auf. Mit `useFonts` aus `expo-font` selbst (nicht
// dem paket-eigenen Re-Export) laden wir nur die tatsächlich genutzten.
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_800ExtraBold } from '@expo-google-fonts/fraunces/800ExtraBold';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { supabase } from './lib/supabase';
import LoginScreen from './screens/LoginScreen';
import HouseholdOnboarding from './screens/HouseholdOnboarding';
import HomeScreen from './screens/HomeScreen';
import type { Household } from './types/household';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [household, setHousehold] = useState<Household | null | undefined>(undefined);

  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  // Session laden + auf Änderungen (Login/Logout) reagieren
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // Haushalts-Mitgliedschaft prüfen, sobald eine Session besteht
  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      setHousehold(null);
      return;
    }
    checkHousehold();
  }, [session]);

  async function checkHousehold() {
    setHousehold(undefined);
    await refreshHousehold();
  }

  // Wie checkHousehold(), aber ohne den Zwischenzustand "undefined" - der
  // würde HomeScreen kurzzeitig unmounten (Ladebildschirm) und damit dessen
  // lokalen State (z.B. offene Einstellungen) verlieren. Für Refreshes nach
  // Änderungen in den Einstellungen wird daher diese Variante verwendet.
  async function refreshHousehold() {
    const { data } = await supabase
      .from('households')
      .select('id, name, invite_code, base_ingredients, todoist_api_token, todoist_project_id')
      .maybeSingle();
    setHousehold(data ?? null);
  }

  if (!fontsLoaded || session === undefined || (session && household === undefined)) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <StatusBar style="auto" />
          <ActivityIndicator size="large" color="#2D6A4F" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <LoginScreen />
      </SafeAreaProvider>
    );
  }

  if (!household) {
    return (
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <HouseholdOnboarding onDone={checkHousehold} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <HomeScreen household={household} onHouseholdChange={refreshHousehold} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#F7F4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
