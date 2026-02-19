import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Dashboard</Text>
      <Text variant="bodyLarge">Your media consumption overview will appear here.</Text>
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
