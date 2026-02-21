import { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTaskStore } from '../../src/task-management/task-store';

export default function SuccessThresholdScreen() {
  const router = useRouter();
  const { goalTasks, successThreshold, updateSuccessThreshold } =
    useTaskStore();

  const totalCount = goalTasks.length;
  const [requiredCount, setRequiredCount] = useState(
    successThreshold?.requiredCount ?? Math.max(1, totalCount)
  );

  useEffect(() => {
    if (requiredCount > totalCount && totalCount > 0) {
      setRequiredCount(totalCount);
    }
  }, [totalCount, requiredCount]);

  const handleIncrement = () => {
    if (requiredCount < totalCount) {
      setRequiredCount((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (requiredCount > 1) {
      setRequiredCount((prev) => prev - 1);
    }
  };

  const handleSave = async () => {
    await updateSuccessThreshold(requiredCount, totalCount);

    const currentError = useTaskStore.getState().error;
    if (!currentError) {
      router.back();
    }
  };

  if (totalCount === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="titleMedium">No Tasks</Text>
        <Text variant="bodyMedium" style={styles.emptyText}>
          Add some tasks first before configuring a success threshold.
        </Text>
        <Button mode="outlined" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Success Threshold
      </Text>

      <Text variant="bodyMedium" style={styles.description}>
        Set the minimum number of tasks to complete for the day to count as
        successful.
      </Text>

      <View style={styles.stepper}>
        <IconButton
          icon="minus"
          mode="contained-tonal"
          onPress={handleDecrement}
          disabled={requiredCount <= 1}
        />
        <Text variant="displaySmall" style={styles.count}>
          {requiredCount}
        </Text>
        <IconButton
          icon="plus"
          mode="contained-tonal"
          onPress={handleIncrement}
          disabled={requiredCount >= totalCount}
        />
      </View>

      <Text variant="titleMedium" style={styles.summary}>
        Complete at least {requiredCount} of {totalCount} tasks
      </Text>

      <Button mode="contained" onPress={handleSave} style={styles.saveButton}>
        Save Threshold
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    color: '#666',
    marginBottom: 24,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  count: {
    minWidth: 48,
    textAlign: 'center',
  },
  summary: {
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 8,
  },
});
