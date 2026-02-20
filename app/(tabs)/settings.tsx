import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  List,
  Switch,
  Text,
  Portal,
  Dialog,
  Button,
  TextInput,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/settings/settings-store';

const DAY_RESET_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, isLoading, error, loadSettings, updateDayResetTime, toggleGlobalBlocking } =
    useSettingsStore();

  const [resetTimeDialogVisible, setResetTimeDialogVisible] = useState(false);
  const [resetTimeInput, setResetTimeInput] = useState('');
  const [resetTimeError, setResetTimeError] = useState('');

  const [disableBlockingDialogVisible, setDisableBlockingDialogVisible] =
    useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleOpenResetTimeDialog = () => {
    setResetTimeInput(settings?.dayResetTime ?? '04:00');
    setResetTimeError('');
    setResetTimeDialogVisible(true);
  };

  const handleSaveResetTime = () => {
    if (!DAY_RESET_TIME_REGEX.test(resetTimeInput)) {
      setResetTimeError('Enter a valid time in HH:MM 24-hour format');
      return;
    }
    updateDayResetTime(resetTimeInput);
    setResetTimeDialogVisible(false);
  };

  const handleToggleGlobalBlocking = (value: boolean) => {
    if (!value) {
      setDisableBlockingDialogVisible(true);
    } else {
      toggleGlobalBlocking(true);
    }
  };

  const handleConfirmDisableBlocking = () => {
    toggleGlobalBlocking(false);
    setDisableBlockingDialogVisible(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge">Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {error && (
        <Text style={styles.errorBanner} variant="bodyMedium">
          {error}
        </Text>
      )}

      <List.Section>
        <List.Subheader>App Management</List.Subheader>
        <List.Item
          title="App Selection"
          description="Choose which apps to monitor"
          left={(props) => <List.Icon {...props} icon="apps" />}
          onPress={() => router.push('/app-selection' as never)}
        />
        <List.Item
          title="Enforcement Levels"
          description="Set blocking strictness per app"
          left={(props) => <List.Icon {...props} icon="shield-check" />}
          onPress={() => router.push('/enforcement-levels' as never)}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Task Management</List.Subheader>
        <List.Item
          title="Schedules"
          description="Configure monitoring schedules"
          left={(props) => <List.Icon {...props} icon="clock-outline" />}
          onPress={() => router.push('/schedules' as never)}
        />
        <List.Item
          title="Tasks"
          description="Manage goal tasks"
          left={(props) => <List.Icon {...props} icon="checkbox-marked-outline" />}
          onPress={() => router.push('/tasks' as never)}
        />
        <List.Item
          title="Success Thresholds"
          description="Define completion criteria"
          left={(props) => <List.Icon {...props} icon="trophy-outline" />}
          onPress={() => router.push('/success-thresholds' as never)}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Display</List.Subheader>
        <List.Item
          title="Day Reset Time"
          description={settings?.dayResetTime ?? '04:00'}
          left={(props) => <List.Icon {...props} icon="weather-sunset" />}
          onPress={handleOpenResetTimeDialog}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>System</List.Subheader>
        <List.Item
          title="Global Blocking"
          description={
            settings?.globalBlockingEnabled ? 'Enabled' : 'Disabled'
          }
          left={(props) => <List.Icon {...props} icon="shield-lock" />}
          right={() => (
            <Switch
              value={settings?.globalBlockingEnabled ?? false}
              onValueChange={handleToggleGlobalBlocking}
            />
          )}
        />
        <List.Item
          title="OEM Setup Wizard"
          description="Configure device-specific permissions"
          left={(props) => <List.Icon {...props} icon="cellphone-cog" />}
          onPress={() => router.push('/oem-setup' as never)}
        />
      </List.Section>

      <Portal>
        <Dialog
          visible={resetTimeDialogVisible}
          onDismiss={() => setResetTimeDialogVisible(false)}
        >
          <Dialog.Title>Day Reset Time</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Time (HH:MM, 24h)"
              value={resetTimeInput}
              onChangeText={(text) => {
                setResetTimeInput(text);
                setResetTimeError('');
              }}
              error={!!resetTimeError}
              keyboardType="numeric"
            />
            {resetTimeError ? (
              <Text style={styles.dialogError} variant="bodySmall">
                {resetTimeError}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetTimeDialogVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleSaveResetTime}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={disableBlockingDialogVisible}
          onDismiss={() => setDisableBlockingDialogVisible(false)}
        >
          <Dialog.Title>Disable Global Blocking?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This will stop monitoring and blocking on all apps. Are you sure?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDisableBlockingDialogVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleConfirmDisableBlocking}>Disable</Button>
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
  },
  dialogError: {
    color: '#B00020',
    marginTop: 4,
  },
});
