import { Image, StyleSheet } from 'react-native';
import { Checkbox, List } from 'react-native-paper';
import type { InstalledApp } from '../app-blocking/blocking-store';

interface AppListItemProps {
  app: InstalledApp;
  isSelected: boolean;
  onToggle: () => void;
}

export function AppListItem({ app, isSelected, onToggle }: AppListItemProps) {
  const icon = app.iconUri
    ? () => (
        <Image
          source={{ uri: app.iconUri }}
          style={styles.icon}
          accessibilityLabel={`${app.appName} icon`}
        />
      )
    : undefined;

  const checkbox = () => (
    <Checkbox
      status={isSelected ? 'checked' : 'unchecked'}
      onPress={onToggle}
    />
  );

  return (
    <List.Item
      title={app.appName}
      description={app.packageName}
      left={icon}
      right={checkbox}
      onPress={onToggle}
      style={styles.item}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 4,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignSelf: 'center',
  },
});
