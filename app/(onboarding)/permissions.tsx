import React, { useState, useCallback } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Button, Card, Text, ProgressBar } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  requestUsageStatsPermission,
  requestOverlayPermission,
  requestBatteryOptimizationExemption,
  hasUsageStatsPermission,
  hasOverlayPermission,
  isBatteryOptimizationEnabled,
} from '../../src/native-bridge/index';
import { PermissionError } from '../../src/shared/error-types';

type StepIndex = 0 | 1 | 2;

interface PermissionStep {
  title: string;
  explanation: string;
  grantLabel: string;
  checkGranted: () => Promise<boolean>;
  request: () => Promise<unknown>;
}

const STEPS: PermissionStep[] = [
  {
    title: 'Usage Stats Access',
    explanation:
      'Healthy Media needs to know which app is in the foreground so it can detect when you open a distracting app and take action. Without this permission the blocking service cannot function.',
    grantLabel: 'Grant Permission',
    checkGranted: () => hasUsageStatsPermission(),
    request: () => requestUsageStatsPermission(),
  },
  {
    title: 'Draw Over Other Apps',
    explanation:
      'To show a focus reminder when you open a restricted app, Healthy Media needs to display a blocking overlay on top of other apps. This is the only way to intercept app launches on Android.',
    grantLabel: 'Grant Permission',
    checkGranted: () => hasOverlayPermission(),
    request: () => requestOverlayPermission(),
  },
  {
    title: 'Battery Optimization',
    explanation:
      'Android may shut down background services to save battery. Exempting Healthy Media from battery optimisation keeps the monitoring service running reliably so your focus sessions are never broken.',
    grantLabel: 'Grant Permission',
    // isBatteryOptimizationEnabled returns true when NOT exempt → granted = NOT enabled
    checkGranted: async () => !(await isBatteryOptimizationEnabled()),
    request: () => requestBatteryOptimizationExemption(),
  },
];

export default function PermissionsScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [granted, setGranted] = useState<boolean[]>([false, false, false]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkCurrentPermission = useCallback(async () => {
    try {
      const isGranted = await STEPS[currentStep].checkGranted();
      setGranted((prev) => {
        const next = [...prev];
        next[currentStep] = isGranted;
        return next;
      });
    } catch {
      // silent — don't interrupt UX on status check failure
    }
  }, [currentStep]);

  // Re-check permission when the screen regains focus (user returns from system settings)
  useFocusEffect(
    useCallback(() => {
      checkCurrentPermission();

      const subscription = AppState.addEventListener(
        'change',
        (nextState: AppStateStatus) => {
          if (nextState === 'active') {
            checkCurrentPermission();
          }
        }
      );

      return () => subscription.remove();
    }, [checkCurrentPermission])
  );

  const handleGrant = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await STEPS[currentStep].request();
      // After the system settings screen returns, re-check actual status
      await checkCurrentPermission();
    } catch (err) {
      const message =
        err instanceof PermissionError
          ? err.message
          : 'Could not open permission settings. Please grant it manually in your device settings.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const advanceStep = () => {
    if (currentStep < 2) {
      setCurrentStep(((currentStep + 1) as StepIndex));
      setErrorMessage(null);
    } else {
      router.push('/(onboarding)/oem-setup');
    }
  };

  const handleSkip = () => {
    advanceStep();
  };

  const handleNext = () => {
    advanceStep();
  };

  const step = STEPS[currentStep];
  const isGranted = granted[currentStep];
  const progress = (currentStep + 1) / 3;
  const isLastStep = currentStep === 2;

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <Text variant="labelMedium" style={styles.progressLabel}>
          {currentStep + 1} of 3
        </Text>
        <ProgressBar progress={progress} style={styles.progressBar} />
      </View>

      {/* Permission card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            {step.title}
          </Text>
          <Text variant="bodyMedium" style={styles.explanation}>
            {step.explanation}
          </Text>

          {isGranted && (
            <Text style={styles.successText} testID="permission-granted-indicator">
              Permission granted
            </Text>
          )}

          {errorMessage !== null && (
            <Text style={styles.errorText} testID="permission-error-message">
              {errorMessage}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        {!isGranted && (
          <Button
            mode="contained"
            onPress={handleGrant}
            loading={loading}
            disabled={loading}
            testID="grant-permission-button"
            style={styles.primaryButton}
          >
            {step.grantLabel}
          </Button>
        )}

        {isGranted ? (
          <Button
            mode="contained"
            onPress={handleNext}
            testID="next-step-button"
            style={styles.primaryButton}
          >
            {isLastStep ? 'Continue' : 'Next'}
          </Button>
        ) : (
          <Button
            mode="text"
            onPress={handleSkip}
            testID="skip-step-button"
            style={styles.skipButton}
          >
            Skip
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  progressContainer: {
    marginTop: 48,
    marginBottom: 16,
  },
  progressLabel: {
    textAlign: 'right',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 24,
  },
  title: {
    marginBottom: 16,
    fontWeight: '600',
  },
  explanation: {
    lineHeight: 22,
    opacity: 0.8,
  },
  successText: {
    marginTop: 16,
    color: '#2e7d32',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 16,
    color: '#c62828',
  },
  actions: {
    marginBottom: 32,
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 4,
  },
  skipButton: {},
});
