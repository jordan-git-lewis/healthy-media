import { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  Dialog,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore } from '../../src/task-management/task-store';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export default function CreateTimeScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scheduleId?: string }>();
  const {
    timeSchedules,
    addTimeSchedule,
    updateTimeSchedule,
    removeTimeSchedule,
    error: storeError,
  } = useTaskStore();

  const existing = params.scheduleId
    ? timeSchedules.find((s) => s.id === params.scheduleId) ?? null
    : null;
  const isEditing = existing !== null;

  const [name, setName] = useState(existing?.name ?? '');
  const [startTime, setStartTime] = useState(existing?.startTime ?? '');
  const [endTime, setEndTime] = useState(existing?.endTime ?? '');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    existing?.daysOfWeek ?? []
  );

  const [nameError, setNameError] = useState('');
  const [startTimeError, setStartTimeError] = useState('');
  const [endTimeError, setEndTimeError] = useState('');
  const [daysError, setDaysError] = useState('');
  const [overlapError, setOverlapError] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    if (storeError && storeError.includes('overlaps')) {
      setOverlapError(storeError);
    }
  }, [storeError]);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    setDaysError('');
  };

  const validate = (): boolean => {
    let valid = true;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Schedule name is required');
      valid = false;
    } else {
      setNameError('');
    }

    if (!TIME_REGEX.test(startTime)) {
      setStartTimeError('Enter a valid time (HH:MM, 24h)');
      valid = false;
    } else {
      setStartTimeError('');
    }

    if (!TIME_REGEX.test(endTime)) {
      setEndTimeError('Enter a valid time (HH:MM, 24h)');
      valid = false;
    } else {
      setEndTimeError('');
    }

    if (TIME_REGEX.test(startTime) && TIME_REGEX.test(endTime) && startTime >= endTime) {
      setEndTimeError('End time must be after start time');
      valid = false;
    }

    if (daysOfWeek.length === 0) {
      setDaysError('Select at least one day');
      valid = false;
    } else {
      setDaysError('');
    }

    setOverlapError('');
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (isEditing && existing) {
      await updateTimeSchedule(existing.id, {
        name: name.trim(),
        startTime,
        endTime,
        daysOfWeek,
      });
    } else {
      await addTimeSchedule({
        name: name.trim(),
        startTime,
        endTime,
        daysOfWeek,
        isActive: true,
      });
    }

    const currentError = useTaskStore.getState().error;
    if (!currentError) {
      router.back();
    } else if (currentError.includes('overlaps')) {
      setOverlapError(currentError);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    setDeleteDialogVisible(false);
    await removeTimeSchedule(existing.id);
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        {isEditing ? 'Edit Schedule' : 'Create Schedule'}
      </Text>

      <TextInput
        label="Schedule Name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setNameError('');
        }}
        error={!!nameError}
        style={styles.input}
      />
      {nameError ? (
        <Text style={styles.errorText} variant="bodySmall">
          {nameError}
        </Text>
      ) : null}

      <TextInput
        label="Start Time (HH:MM, 24h)"
        value={startTime}
        onChangeText={(text) => {
          setStartTime(text);
          setStartTimeError('');
        }}
        error={!!startTimeError}
        keyboardType="numeric"
        style={styles.input}
      />
      {startTimeError ? (
        <Text style={styles.errorText} variant="bodySmall">
          {startTimeError}
        </Text>
      ) : null}

      <TextInput
        label="End Time (HH:MM, 24h)"
        value={endTime}
        onChangeText={(text) => {
          setEndTime(text);
          setEndTimeError('');
        }}
        error={!!endTimeError}
        keyboardType="numeric"
        style={styles.input}
      />
      {endTimeError ? (
        <Text style={styles.errorText} variant="bodySmall">
          {endTimeError}
        </Text>
      ) : null}

      <Text variant="titleMedium" style={styles.sectionLabel}>
        Days of Week
      </Text>
      <View style={styles.chipRow}>
        {DAY_LABELS.map((label, index) => (
          <Chip
            key={index}
            selected={daysOfWeek.includes(index)}
            onPress={() => toggleDay(index)}
            style={styles.chip}
          >
            {label}
          </Chip>
        ))}
      </View>
      {daysError ? (
        <Text style={styles.errorText} variant="bodySmall">
          {daysError}
        </Text>
      ) : null}

      {overlapError ? (
        <Text style={styles.overlapError} variant="bodyMedium">
          {overlapError}
        </Text>
      ) : null}

      <Button mode="contained" onPress={handleSave} style={styles.saveButton}>
        {isEditing ? 'Update Schedule' : 'Create Schedule'}
      </Button>

      {isEditing && (
        <Button
          mode="outlined"
          textColor="#B00020"
          onPress={() => setDeleteDialogVisible(true)}
          style={styles.deleteButton}
        >
          Delete Schedule
        </Button>
      )}

      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Delete Schedule?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete &quot;{existing?.name}&quot;? This
              cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleDelete}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  title: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 4,
  },
  sectionLabel: {
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  errorText: {
    color: '#B00020',
    marginBottom: 8,
  },
  overlapError: {
    color: '#B00020',
    backgroundColor: '#FDECEA',
    padding: 12,
    borderRadius: 4,
    marginTop: 16,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 24,
  },
  deleteButton: {
    marginTop: 12,
  },
});
