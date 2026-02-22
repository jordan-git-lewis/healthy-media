import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../src/settings/settings-store';

export default function Index() {
  const router = useRouter();
  const { settings, isLoading, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (isLoading) return;
    if (settings?.onboardingCompleted) {
      router.replace('/(tabs)/dashboard');
    } else {
      router.replace('/(onboarding)/survey');
    }
  }, [isLoading, settings, router]);

  return (
    <View style={styles.container}>
      <Text variant="bodyLarge">Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
