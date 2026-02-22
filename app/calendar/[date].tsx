import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  ProgressBar,
  Chip,
  ActivityIndicator,
  Divider,
  List,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import type { DayDetail, DailyStatus } from '../../src/calendar-tracking/calendar-types';
import * as calendarService from '../../src/calendar-tracking/calendar-service';
import { getDatabase } from '../../src/database/database';

const STATUS_COLORS: Record<DailyStatus, string> = {
  full_success: '#4CAF50',
  partial_success: '#FFC107',
  not_met: '#F44336',
};

const STATUS_LABELS: Record<DailyStatus, string> = {
  full_success: 'Full Success',
  partial_success: 'Partial Success',
  not_met: 'Not Met',
};

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimestamp(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;

    async function loadDayDetail() {
      try {
        setIsLoading(true);
        setError(null);
        const db = await getDatabase();
        const detail = await calendarService.getDayDetail(db, date as string);
        setDayDetail(detail);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load day detail'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDayDetail();
  }, [date]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge" style={styles.errorText}>
          {error}
        </Text>
      </View>
    );
  }

  if (!dayDetail) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">No activity recorded</Text>
      </View>
    );
  }

  const { record, overrideEvents, goalTasks, timeSchedules } = dayDetail;
  const statusColor = STATUS_COLORS[record.status];
  const statusLabel = STATUS_LABELS[record.status];
  const taskProgress =
    record.goalTasksTotal > 0
      ? record.goalTasksCompleted / record.goalTasksTotal
      : 0;

  const hasNoActivity =
    record.goalTasksTotal === 0 &&
    overrideEvents.length === 0 &&
    timeSchedules.length === 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Date Header */}
      <Text variant="headlineSmall" style={styles.dateHeader}>
        {formatDateHeader(date as string)}
      </Text>

      {/* Status Badge */}
      <View style={styles.statusContainer}>
        <Chip
          style={[styles.statusChip, { backgroundColor: statusColor }]}
          textStyle={styles.statusChipText}
        >
          {statusLabel}
        </Chip>
      </View>

      {hasNoActivity ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="bodyLarge" style={styles.noActivity}>
              No activity recorded for this day.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          {/* Goal Tasks Section */}
          {record.goalTasksTotal > 0 && (
            <Card style={styles.card}>
              <Card.Title title="Goal Tasks" />
              <Card.Content>
                <Text variant="bodyMedium" style={styles.taskSummary}>
                  {record.goalTasksCompleted} of {record.goalTasksTotal} tasks
                  completed
                </Text>
                <ProgressBar
                  progress={taskProgress}
                  color={statusColor}
                  style={styles.progressBar}
                />
                <Divider style={styles.divider} />
                {goalTasks.map((task) => (
                  <List.Item
                    key={task.id}
                    title={task.name}
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={task.isCompleted ? 'check-circle' : 'circle-outline'}
                        color={task.isCompleted ? '#4CAF50' : '#9E9E9E'}
                      />
                    )}
                    titleStyle={
                      task.isCompleted ? styles.completedTask : undefined
                    }
                  />
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Success Threshold Section */}
          <Card style={styles.card}>
            <Card.Title title="Success Threshold" />
            <Card.Content>
              <Text variant="bodyMedium">
                Complete at least{' '}
                <Text style={styles.bold}>{record.successThreshold}</Text> of{' '}
                <Text style={styles.bold}>{record.goalTasksTotal}</Text> tasks
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.thresholdStatus,
                  record.goalTasksCompleted >= record.successThreshold
                    ? styles.thresholdMet
                    : styles.thresholdNotMet,
                ]}
              >
                {record.goalTasksCompleted >= record.successThreshold
                  ? 'Threshold met'
                  : 'Threshold not met'}
              </Text>
            </Card.Content>
          </Card>

          {/* Override Events Section */}
          <Card style={styles.card}>
            <Card.Title
              title="Override Events"
              subtitle={`${overrideEvents.length} override${overrideEvents.length !== 1 ? 's' : ''}`}
            />
            <Card.Content>
              {overrideEvents.length === 0 ? (
                <Text variant="bodyMedium" style={styles.emptySection}>
                  No override events recorded.
                </Text>
              ) : (
                overrideEvents.map((ev, index) => (
                  <List.Item
                    key={index}
                    title={ev.appName}
                    description={formatTimestamp(ev.timestamp)}
                    left={(props) => (
                      <List.Icon {...props} icon="alert-circle-outline" color="#F44336" />
                    )}
                  />
                ))
              )}
            </Card.Content>
          </Card>

          {/* Time Schedule Section */}
          <Card style={styles.card}>
            <Card.Title title="Time Schedules" />
            <Card.Content>
              <Text variant="bodyMedium" style={styles.adherenceLabel}>
                Schedule adherence:{' '}
                <Text
                  style={
                    record.timeScheduleAdherence === 1
                      ? styles.adherenceGood
                      : styles.adherenceBad
                  }
                >
                  {record.timeScheduleAdherence === 1 ? 'Respected' : 'Broken'}
                </Text>
              </Text>
              {timeSchedules.length === 0 ? (
                <Text variant="bodySmall" style={styles.emptySection}>
                  No active schedules for this day.
                </Text>
              ) : (
                timeSchedules.map((schedule) => (
                  <List.Item
                    key={schedule.id}
                    title={schedule.name}
                    description={`${schedule.startTime} – ${schedule.endTime}`}
                    left={(props) => (
                      <List.Icon {...props} icon="clock-outline" />
                    )}
                  />
                ))
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#616161',
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
  },
  dateHeader: {
    fontWeight: '700',
    marginBottom: 4,
  },
  statusContainer: {
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  statusChip: {
    borderRadius: 16,
  },
  statusChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
  },
  taskSummary: {
    marginBottom: 8,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#9E9E9E',
  },
  bold: {
    fontWeight: '700',
  },
  thresholdStatus: {
    marginTop: 4,
    fontWeight: '600',
  },
  thresholdMet: {
    color: '#4CAF50',
  },
  thresholdNotMet: {
    color: '#F44336',
  },
  adherenceLabel: {
    marginBottom: 8,
  },
  adherenceGood: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  adherenceBad: {
    color: '#F44336',
    fontWeight: '700',
  },
  emptySection: {
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  noActivity: {
    color: '#9E9E9E',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 16,
  },
});
