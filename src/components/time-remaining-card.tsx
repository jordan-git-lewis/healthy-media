import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import type { TimeSchedule } from '../task-management/task-types';

interface TimeRemainingCardProps {
  currentSchedule: TimeSchedule | null;
  nextSchedule: TimeSchedule | null;
}

export function TimeRemainingCard({
  currentSchedule,
  nextSchedule,
}: TimeRemainingCardProps) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium">Time Schedules</Text>
        {currentSchedule ? (
          <>
            <Text variant="bodyMedium" style={styles.statusText}>
              Currently active: {currentSchedule.name}
            </Text>
            <Text variant="bodySmall">
              {currentSchedule.startTime} – {currentSchedule.endTime}
            </Text>
          </>
        ) : nextSchedule ? (
          <>
            <Text variant="bodyMedium" style={styles.statusText}>
              Next schedule: {nextSchedule.name}
            </Text>
            <Text variant="bodySmall">
              Starts at {nextSchedule.startTime}
            </Text>
          </>
        ) : (
          <Text variant="bodyMedium" style={styles.statusText}>
            No schedules active today
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  statusText: {
    marginTop: 8,
  },
});
