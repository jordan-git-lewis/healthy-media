import React, { useState, useEffect, useMemo } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Searchbar,
  Text,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { scanInstalledApps } from '../../src/native-bridge';
import { NativeBridgeError } from '../../src/shared/error-types';
import { useBlockingStore } from '../../src/app-blocking/blocking-store';
import { AppListItem } from '../../src/components/app-list-item';
import type { InstalledApp } from '../../src/app-blocking/blocking-store';

export default function AppSelectionScreen() {
  const router = useRouter();
  const { blockedApps, hydrate, addApp, removeApp } = useBlockingStore();

  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const scan = async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      await hydrate();
      const installed = await scanInstalledApps();
      setApps(installed);
    } catch (err) {
      if (err instanceof NativeBridgeError) {
        setScanError(err.message);
      } else {
        setScanError('Failed to scan installed apps. Please try again.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((app) =>
      app.appName.toLowerCase().includes(q) ||
      app.packageName.toLowerCase().includes(q)
    );
  }, [apps, searchQuery]);

  const blockedPackageNames = useMemo(
    () => new Set(blockedApps.map((a) => a.packageName)),
    [blockedApps]
  );

  const handleToggle = async (app: InstalledApp) => {
    if (blockedPackageNames.has(app.packageName)) {
      const existing = blockedApps.find((a) => a.packageName === app.packageName);
      if (existing) {
        await removeApp(existing.id);
      }
    } else {
      await addApp(app);
    }
  };

  const hasSelections = blockedApps.length > 0;

  if (isScanning) {
    return (
      <View style={styles.centered} testID="scanning-indicator">
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Scanning installed apps...
        </Text>
      </View>
    );
  }

  if (scanError !== null) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium" style={styles.errorText} testID="scan-error-message">
          {scanError}
        </Text>
        <Button
          mode="contained"
          onPress={scan}
          style={styles.retryButton}
          testID="retry-scan-button"
        >
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Select Apps to Restrict
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Choose which apps you want Healthy Media to manage.
      </Text>

      <Searchbar
        placeholder="Search apps"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        testID="app-search-bar"
      />

      <FlatList
        data={filteredApps}
        keyExtractor={(item) => item.packageName}
        renderItem={({ item }) => (
          <AppListItem
            app={item}
            isSelected={blockedPackageNames.has(item.packageName)}
            onToggle={() => handleToggle(item)}
          />
        )}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        testID="app-list"
      />

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => router.push('/(onboarding)/enforcement-config')}
          disabled={!hasSelections}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  footer: {
    padding: 24,
    paddingTop: 12,
  },
  continueButton: {
    paddingVertical: 4,
  },
  loadingText: {
    marginTop: 16,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#c62828',
  },
  retryButton: {
    marginTop: 8,
  },
});
