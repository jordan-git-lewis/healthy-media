import React, { useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, IconButton, ActivityIndicator, Surface } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useCalendarStore } from '../../src/calendar-tracking/calendar-store';
import { CalendarGrid } from '../../src/components/calendar-grid';
import { formatDate } from '../../src/shared/date-utils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
  const {
    currentYear,
    currentMonth,
    dailyRecords,
    todayStatus,
    isLoading,
    loadMonth,
    refreshToday,
    navigateMonth,
  } = useCalendarStore();

  // Load data when the screen mounts
  useEffect(() => {
    loadMonth(currentYear, currentMonth);
    refreshToday();
  }, []);

  // Refresh today on tab focus
  useFocusEffect(
    useCallback(() => {
      refreshToday();
    }, [])
  );

  const handleDayPress = (date: string) => {
    router.push(`/calendar/${date}`);
  };

  const handlePreviousMonth = () => {
    navigateMonth(-1);
  };

  const handleNextMonth = () => {
    navigateMonth(1);
  };

  const currentDate = new Date(currentYear, currentMonth - 1, 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Month Navigation Header */}
      <Surface style={styles.header} elevation={1}>
        <IconButton
          icon="chevron-left"
          size={24}
          onPress={handlePreviousMonth}
          accessibilityLabel="Previous month"
        />
        <Text variant="titleLarge" style={styles.monthTitle}>
          {MONTH_NAMES[currentMonth - 1]} {currentYear}
        </Text>
        <IconButton
          icon="chevron-right"
          size={24}
          onPress={handleNextMonth}
          accessibilityLabel="Next month"
        />
      </Surface>

      {/* Today's Status Banner */}
      {todayStatus && (
        <Surface style={styles.todayBanner} elevation={1}>
          <Text variant="bodyMedium" style={styles.todayLabel}>
            Today ({formatDate(new Date())}):{'  '}
            <Text
              style={[
                styles.todayStatus,
                todayStatus === 'full_success' && styles.statusSuccess,
                todayStatus === 'partial_success' && styles.statusPartial,
                todayStatus === 'not_met' && styles.statusNotMet,
              ]}
            >
              {todayStatus === 'full_success'
                ? 'Full Success'
                : todayStatus === 'partial_success'
                ? 'Partial Success'
                : 'Not Met'}
            </Text>
          </Text>
        </Surface>
      )}

      {/* Calendar Grid or Loading */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <CalendarGrid
          dailyRecords={dailyRecords}
          currentDate={currentDate}
          onDayPress={handleDayPress}
        />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  monthTitle: {
    fontWeight: '700',
  },
  todayBanner: {
    borderRadius: 8,
    padding: 12,
  },
  todayLabel: {
    textAlign: 'center',
  },
  todayStatus: {
    fontWeight: '700',
  },
  statusSuccess: {
    color: '#4CAF50',
  },
  statusPartial: {
    color: '#FFC107',
  },
  statusNotMet: {
    color: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
});
