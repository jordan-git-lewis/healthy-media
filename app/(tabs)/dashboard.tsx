import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useDashboardStore } from '../../src/dashboard/dashboard-store';
import { useSettingsStore } from '../../src/settings/settings-store';
import { TaskProgressCard } from '../../src/components/task-progress-card';
import { TimeRemainingCard } from '../../src/components/time-remaining-card';

export default function DashboardScreen() {
  const router = useRouter();
  const { dashboard, isLoading, error, loadDashboard } = useDashboardStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    loadDashboard();
    loadSettings();
  }, [loadDashboard, loadSettings]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">Loading dashboard...</Text>
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

      {dashboard && (
        <>
          <TaskProgressCard
            completedCount={dashboard.completedCount}
            totalCount={dashboard.totalCount}
          />

          <TimeRemainingCard
            currentSchedule={dashboard.currentSchedule}
            nextSchedule={dashboard.nextSchedule}
          />

          <Card style={styles.card}>
            <Card.Content style={styles.blockingContent}>
              {dashboard.isActivelyBlocking ? (
                <>
                  <MaterialCommunityIcons
                    name="shield-lock"
                    size={32}
                    color="#4CAF50"
                  />
                  <Text variant="titleMedium" style={styles.blockingText}>
                    Blocking Active
                  </Text>
                  <Text variant="bodySmall">
                    Apps are currently being blocked
                  </Text>
                </>
              ) : dashboard.isInScheduleWindow &&
                !dashboard.globalBlockingEnabled ? (
                <>
                  <MaterialCommunityIcons
                    name="shield-off"
                    size={32}
                    color="#FF9800"
                  />
                  <Text variant="titleMedium" style={styles.blockingText}>
                    Blocking Disabled
                  </Text>
                  <Text variant="bodySmall">
                    In schedule window but global blocking is off
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={32}
                    color="#9E9E9E"
                  />
                  <Text variant="titleMedium" style={styles.blockingText}>
                    Not In Schedule
                  </Text>
                  <Text variant="bodySmall">
                    No active blocking schedule right now
                  </Text>
                </>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.quickActionsTitle}>
                Quick Actions
              </Text>
              <View style={styles.actions}>
                <Button
                  mode="outlined"
                  icon="checkbox-marked-outline"
                  onPress={() => router.push('/tasks' as never)}
                  style={styles.actionButton}
                >
                  Manage Tasks
                </Button>
                <Button
                  mode="outlined"
                  icon="calendar"
                  onPress={() => router.navigate('/(tabs)/calendar')}
                  style={styles.actionButton}
                >
                  View Calendar
                </Button>
                <Button
                  mode="outlined"
                  icon="apps"
                  onPress={() => router.push('/app-selection' as never)}
                  style={styles.actionButton}
                >
                  Edit Blocked Apps
                </Button>
              </View>
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
  card: {
    marginBottom: 16,
  },
  blockingContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  blockingText: {
    marginTop: 8,
  },
  quickActionsTitle: {
    marginBottom: 12,
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    alignSelf: 'stretch',
  },
});
