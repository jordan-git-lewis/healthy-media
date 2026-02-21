import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTaskStore } from '../../src/task-management/task-store';

export default function CreateGoalTaskScreen() {
  const router = useRouter();
  const { addGoalTask } = useTaskStore();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Task name cannot be empty');
      return;
    }

    await addGoalTask(trimmed);

    const currentError = useTaskStore.getState().error;
    if (!currentError) {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Create Task
      </Text>

      <TextInput
        label="Task Name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setNameError('');
        }}
        error={!!nameError}
        autoFocus
        style={styles.input}
      />
      {nameError ? (
        <Text style={styles.errorText} variant="bodySmall">
          {nameError}
        </Text>
      ) : null}

      <Button mode="contained" onPress={handleSave} style={styles.saveButton}>
        Create Task
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 4,
  },
  errorText: {
    color: '#B00020',
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 24,
  },
});
