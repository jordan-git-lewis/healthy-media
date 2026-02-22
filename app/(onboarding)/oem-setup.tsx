import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, AppState, AppStateStatus, Alert } from 'react-native';
import { Button, Card, Text, Banner, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import {
  getDeviceManufacturer,
  openOEMPowerSettings,
  isBatteryOptimizationEnabled,
} from '../../src/native-bridge/index';
import { getOEMInstructions } from '../../src/onboarding/oem-instructions';

export { getOEMInstructions } from '../../src/onboarding/oem-instructions';
export type { OEMInstructions } from '../../src/onboarding/oem-instructions';

export default function OEMSetupScreen() {
  const router = useRouter();
  const manufacturer = getDeviceManufacturer();
  const instructions = getOEMInstructions(manufacturer);

  const [openSettingsFailed, setOpenSettingsFailed] = useState(false);
  const [batteryNotExempt, setBatteryNotExempt] = useState(false);
  const [checkingBattery, setCheckingBattery] = useState(false);

  const checkBatteryStatus = useCallback(async () => {
    setCheckingBattery(true);
    try {
      const isOptimized = await isBatteryOptimizationEnabled();
      // isOptimized = true means the app is NOT exempt (not granted)
      setBatteryNotExempt(isOptimized);
    } catch {
      // silent
    } finally {
      setCheckingBattery(false);
    }
  }, []);

  // Run on mount and whenever the app returns to foreground
  useEffect(() => {
    checkBatteryStatus();

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          checkBatteryStatus();
        }
      }
    );

    return () => subscription.remove();
  }, [checkBatteryStatus]);

  const handleOpenSettings = async () => {
    try {
      const opened = await openOEMPowerSettings();
      if (!opened) {
        setOpenSettingsFailed(true);
      }
    } catch {
      setOpenSettingsFailed(true);
    }
  };

  const handleDone = () => {
    if (batteryNotExempt && !instructions.isGeneric) {
      Alert.alert(
        'Battery optimization still active',
        'Healthy Media may not run reliably in the background. Are you sure you want to continue?',
        [
          { text: 'Go back', style: 'cancel' },
          {
            text: 'Continue anyway',
            onPress: () => router.replace('/(tabs)/dashboard'),
          },
        ]
      );
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  return (
    <View style={styles.container}>
      {/* Banner shown when battery optimization is still active */}
      {batteryNotExempt && !checkingBattery && (
        <Banner
          visible
          icon="battery-alert"
          actions={[
            {
              label: 'Open settings',
              onPress: handleOpenSettings,
            },
          ]}
          testID="battery-recheck-banner"
        >
          Battery optimization is still active. Please follow the steps below
          and tap &quot;Open Settings&quot; so Healthy Media can protect your focus time.
        </Banner>
      )}

      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.heading}>
          {instructions.isGeneric
            ? 'All done!'
            : `${instructions.oemName} Battery Settings`}
        </Text>

        <Text variant="bodyMedium" style={styles.subheading}>
          {instructions.isGeneric
            ? 'Your device uses standard Android battery management.'
            : `${instructions.oemName} devices require a few extra steps so Healthy Media can protect your focus time.`}
        </Text>

        {/* Numbered steps — only shown for non-generic OEMs */}
        {!instructions.isGeneric && instructions.steps.length > 0 && (
          <Card style={styles.stepsCard}>
            <Card.Content>
              {instructions.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{index + 1}.</Text>
                  <Text variant="bodyMedium" style={styles.stepText}>
                    {step}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Additional note */}
        {instructions.note !== undefined && (
          <Text variant="bodySmall" style={styles.note} testID="oem-note">
            {instructions.note}
          </Text>
        )}

        {/* Open OEM settings button — hidden for generic / if intent failed */}
        {!instructions.isGeneric && !openSettingsFailed && (
          <Button
            mode="contained"
            onPress={handleOpenSettings}
            style={styles.openButton}
            testID="open-oem-settings-button"
          >
            Open Settings
          </Button>
        )}

        {/* Fallback shown when openOEMPowerSettings returned false */}
        {openSettingsFailed && (
          <Text style={styles.fallbackText} testID="oem-settings-fallback">
            No OEM-specific settings found — your device uses standard Android
            battery management. No additional steps needed.
          </Text>
        )}

        <Divider style={styles.divider} />

        <Button
          mode={instructions.isGeneric ? 'contained' : 'outlined'}
          onPress={handleDone}
          testID="done-button"
          style={styles.doneButton}
        >
          Done
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  heading: {
    marginTop: 48,
    marginBottom: 8,
    fontWeight: '700',
  },
  subheading: {
    marginBottom: 24,
    opacity: 0.75,
    lineHeight: 22,
  },
  stepsCard: {
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  stepNumber: {
    fontWeight: '700',
    minWidth: 20,
  },
  stepText: {
    flex: 1,
    lineHeight: 20,
  },
  note: {
    marginBottom: 16,
    opacity: 0.65,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  openButton: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  fallbackText: {
    marginBottom: 16,
    color: '#1b5e20',
    lineHeight: 20,
  },
  divider: {
    marginVertical: 16,
  },
  doneButton: {
    paddingVertical: 4,
  },
});
