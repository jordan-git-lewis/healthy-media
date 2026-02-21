import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Checkbox,
  IconButton,
  List,
  Text,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTaskStore } from '../../src/task-management/task-store';
import { TaskProgressCard } from '../../src/components/task-progress-card';

export default function TaskManagementIndexScreen() {
  const router = useRouter();
  const {
    goalTasks,
    timeSchedules,
    successThreshold,
    isLoading,
    error,
    hydrate,
    toggleGoalTaskCompletion,
    removeGoalTask,
  } = useTaskStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const completedCount = goalTasks.filter((t) => t.isCompleted).length;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">Loading tasks...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error && (
        <Text style={styles.errorBanner} variant="bodyMedium">
          {error}
        </Text>
      )}

      <TaskProgressCard
        completedCount={completedCount}
        totalCount={goalTasks.length}
      />

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium">Today&apos;s Tasks</Text>
        <Button
          mode="contained-tonal"
          compact
          onPress={() => router.push('/task-management/create-goal-task')}
        >
          Add Task
        </Button>
      </View>

      {goalTasks.length === 0 ? (
        <Text variant="bodyMedium" style={styles.emptyText}>
          No tasks for today. Add one to get started.
        </Text>
      ) : (
        goalTasks.map((task) => (
          <List.Item
            key={task.id}
            title={task.name}
            titleStyle={task.isCompleted ? styles.completedTask : undefined}
            left={() => (
              <Checkbox
                status={task.isCompleted ? 'checked' : 'unchecked'}
                onPress={() => toggleGoalTaskCompletion(task.id)}
              />
            )}
            right={() => (
              <IconButton
                icon="delete-outline"
                size={20}
                onPress={() => removeGoalTask(task.id)}
              />
            )}
          />
        ))
      )}

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium">Time Schedules</Text>
        <Button
          mode="contained-tonal"
          compact
          onPress={() => router.push('/task-management/create-time-schedule')}
        >
          Add Schedule
        </Button>
      </View>

      {timeSchedules.length === 0 ? (
        <Text variant="bodyMedium" style={styles.emptyText}>
          No active schedules.
        </Text>
      ) : (
        timeSchedules.map((schedule) => (
          <Card
            key={schedule.id}
            style={styles.scheduleCard}
            onPress={() =>
              router.push(
                `/task-management/create-time-schedule?scheduleId=${schedule.id}`
              )
            }
          >
            <Card.Content>
              <Text variant="titleSmall">{schedule.name}</Text>
              <Text variant="bodySmall">
                {schedule.startTime} – {schedule.endTime}
              </Text>
            </Card.Content>
          </Card>
        ))
      )}

      <Card style={styles.thresholdCard}>
        <Card.Content>
          <Text variant="titleMedium">Success Threshold</Text>
          {successThreshold ? (
            <Text variant="bodyMedium" style={styles.thresholdText}>
              Complete at least {successThreshold.requiredCount} of{' '}
              {successThreshold.totalCount} tasks
            </Text>
          ) : (
            <Text variant="bodyMedium" style={styles.thresholdText}>
              Not configured
            </Text>
          )}
          <Button
            mode="outlined"
            compact
            onPress={() => router.push('/task-management/success-threshold')}
            style={styles.thresholdButton}
          >
            Configure
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  errorBanner: {
    backgroundColor: '#FDECEA',
    color: '#B00020',
    padding: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    marginBottom: 8,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  scheduleCard: {
    marginBottom: 8,
  },
  thresholdCard: {
    marginTop: 16,
  },
  thresholdText: {
    marginTop: 4,
  },
  thresholdButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
});
