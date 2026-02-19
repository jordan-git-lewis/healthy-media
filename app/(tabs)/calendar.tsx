import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Calendar</Text>
      <Text variant="bodyLarge">Your media schedule will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
});
