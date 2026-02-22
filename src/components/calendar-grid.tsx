import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import type { DailyRecord, DailyStatus } from '../calendar-tracking/calendar-types';
import { formatDate } from '../shared/date-utils';

const STATUS_COLORS: Record<DailyStatus, string> = {
  full_success: '#4CAF50',
  partial_success: '#FFC107',
  not_met: '#F44336',
};

const NO_DATA_COLOR = '#9E9E9E';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarGridProps {
  dailyRecords: Map<string, DailyRecord>;
  currentDate: Date;
  onDayPress: (date: string) => void;
}

function getDayColor(
  date: string,
  dailyRecords: Map<string, DailyRecord>
): string {
  const record = dailyRecords.get(date);
  if (!record) return NO_DATA_COLOR;
  return STATUS_COLORS[record.status];
}

export function CalendarGrid({
  dailyRecords,
  currentDate,
  onDayPress,
}: CalendarGridProps) {
  const today = formatDate(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // First day of the month and total days
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build grid cells: leading empties + days + trailing empties
  const cells: Array<{ day: number | null; date: string | null }> = [];

  // Leading empty cells
  for (let i = 0; i < startingDayOfWeek; i++) {
    cells.push({ day: null, date: null });
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = formatDate(d);
    cells.push({ day, date: dateStr });
  }

  // Trailing empties to complete last row
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push({ day: null, date: null });
    }
  }

  // Split into rows of 7
  const rows: Array<typeof cells> = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      {/* Day-of-week headers */}
      <View style={styles.headerRow}>
        {DAY_HEADERS.map((header) => (
          <View key={header} style={styles.headerCell}>
            <Text variant="labelSmall" style={styles.headerText}>
              {header}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar rows */}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, colIndex) => {
            if (!cell.date || !cell.day) {
              return <View key={colIndex} style={styles.emptyCell} />;
            }

            const dateStr = cell.date;
            const isFuture = dateStr > today;
            const isToday = dateStr === today;
            const color = isFuture ? '#BDBDBD' : getDayColor(dateStr, dailyRecords);

            return (
              <TouchableOpacity
                key={colIndex}
                style={styles.cellWrapper}
                onPress={() => !isFuture && onDayPress(dateStr)}
                disabled={isFuture}
                accessibilityLabel={`Day ${cell.day}, status: ${dailyRecords.get(dateStr)?.status ?? 'no data'}`}
              >
                <Surface
                  style={[
                    styles.cell,
                    { backgroundColor: color },
                    isToday && styles.todayCell,
                    isFuture && styles.futureCell,
                  ]}
                  elevation={isToday ? 3 : 1}
                >
                  <Text
                    variant="labelMedium"
                    style={[
                      styles.dayText,
                      isFuture && styles.futureDayText,
                      isToday && styles.todayDayText,
                    ]}
                  >
                    {cell.day}
                  </Text>
                  {isToday && <View style={styles.todayDot} />}
                </Surface>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerText: {
    color: '#616161',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cellWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCell: {
    flex: 1,
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#1565C0',
  },
  futureCell: {
    opacity: 0.4,
  },
  dayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  futureDayText: {
    color: '#757575',
  },
  todayDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  todayDot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1565C0',
  },
});
