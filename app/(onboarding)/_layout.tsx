import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="survey" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="oem-setup" />
      <Stack.Screen name="app-selection" />
      <Stack.Screen name="enforcement-config" />
    </Stack>
  );
}
