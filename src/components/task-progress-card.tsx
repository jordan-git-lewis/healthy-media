import { StyleSheet } from 'react-native';
import { Card, ProgressBar, Text } from 'react-native-paper';

interface TaskProgressCardProps {
  completedCount: number;
  totalCount: number;
}

export function TaskProgressCard({
  completedCount,
  totalCount,
}: TaskProgressCardProps) {
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium">Task Progress</Text>
        {totalCount === 0 ? (
          <Text variant="bodyMedium" style={styles.statusText}>
            No tasks for today
          </Text>
        ) : (
          <Text variant="bodyMedium" style={styles.statusText}>
            {completedCount} of {totalCount} tasks complete
          </Text>
        )}
        <ProgressBar progress={progress} style={styles.progressBar} />
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
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
});
