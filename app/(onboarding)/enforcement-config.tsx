import React, { useEffect } from 'react';
import { FlatList, Image, View, StyleSheet } from 'react-native';
import { Button, Divider, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useBlockingStore } from '../../src/app-blocking/blocking-store';
import { EnforcementPicker } from '../../src/components/enforcement-picker';
import type { BlockedApp, EnforcementLevel } from '../../src/app-blocking/blocking-types';

export default function EnforcementConfigScreen() {
  const router = useRouter();
  const { blockedApps, isHydrated, hydrate, updateEnforcement } = useBlockingStore();

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  const sortedApps = [...blockedApps].sort((a, b) =>
    a.appName.localeCompare(b.appName)
  );

  const handleEnforcementChange = async (id: string, level: EnforcementLevel) => {
    await updateEnforcement(id, level);
  };

  const renderItem = ({ item }: { item: BlockedApp }) => (
    <View style={styles.row} testID={`enforcement-row-${item.packageName}`}>
      <View style={styles.appInfo}>
        {item.iconUri ? (
          <Image
            source={{ uri: item.iconUri }}
            style={styles.icon}
            accessibilityLabel={`${item.appName} icon`}
          />
        ) : (
          <View style={[styles.icon, styles.iconPlaceholder]} />
        )}
        <View style={styles.appText}>
          <Text variant="bodyLarge" numberOfLines={1}>
            {item.appName}
          </Text>
          <Text variant="bodySmall" style={styles.packageName} numberOfLines={1}>
            {item.packageName}
          </Text>
        </View>
      </View>
      <EnforcementPicker
        value={item.enforcementLevel}
        onChange={(level) => handleEnforcementChange(item.id, level)}
      />
      <Divider style={styles.divider} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Set Enforcement Levels
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Choose how strictly each app is blocked during focus time.
      </Text>

      <FlatList
        data={sortedApps}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        testID="enforcement-list"
      />

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => router.push('/(onboarding)/oem-setup')}
          testID="continue-button"
          style={styles.continueButton}
        >
          Continue
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 24,
  },
  title: {
    paddingHorizontal: 24,
    marginBottom: 8,
    fontWeight: '600',
  },
  subtitle: {
    paddingHorizontal: 24,
    marginBottom: 16,
    opacity: 0.7,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  row: {
    paddingVertical: 12,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  iconPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  appText: {
    flex: 1,
  },
  packageName: {
    opacity: 0.6,
  },
  divider: {
    marginTop: 12,
  },
  footer: {
    padding: 24,
    paddingTop: 12,
  },
  continueButton: {
    paddingVertical: 4,
  },
});
