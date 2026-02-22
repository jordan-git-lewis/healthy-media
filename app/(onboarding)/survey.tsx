import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/settings/settings-store';

type SurveyOption = 'student' | 'work' | 'general';

interface OptionConfig {
  value: SurveyOption;
  label: string;
  description: string;
}

const OPTIONS: OptionConfig[] = [
  {
    value: 'student',
    label: 'Student / Studying',
    description: 'Reduce distractions while learning',
  },
  {
    value: 'work',
    label: 'Work / Professional',
    description: 'Stay focused during work hours',
  },
  {
    value: 'general',
    label: 'General screen time reduction',
    description: 'Build healthier digital habits',
  },
];

export default function SurveyScreen() {
  const router = useRouter();
  const { updateSurveyResponse, completeOnboarding } = useSettingsStore();
  const [selected, setSelected] = useState<SurveyOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selected || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateSurveyResponse(selected);
      await completeOnboarding();
      router.replace('/(tabs)/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Why are you using this app?
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Help us understand your goals. This does not affect app configuration.
        </Text>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const isActive = selected === option.value;
          return (
            <Button
              key={option.value}
              mode={isActive ? 'contained' : 'outlined'}
              onPress={() => setSelected(option.value)}
              style={styles.optionButton}
              contentStyle={styles.optionContent}
            >
              {option.label}
            </Button>
          );
        })}
      </View>

      <Button
        mode="contained"
        onPress={handleContinue}
        disabled={!selected || isSubmitting}
        loading={isSubmitting}
        style={styles.continueButton}
      >
        Continue
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  options: {
    gap: 12,
    marginBottom: 40,
  },
  optionButton: {
    borderRadius: 8,
  },
  optionContent: {
    paddingVertical: 8,
  },
  continueButton: {
    borderRadius: 8,
  },
});
