import { StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import type { EnforcementLevel } from '../app-blocking/blocking-types';

interface EnforcementPickerProps {
  value: EnforcementLevel;
  onChange: (level: EnforcementLevel) => void;
}

const ENFORCEMENT_OPTIONS: Array<{
  value: EnforcementLevel;
  label: string;
}> = [
  { value: 'hard_block', label: 'Hard Block' },
  { value: 'soft_warning', label: 'Warning' },
  { value: 'off', label: 'Off' },
];

export function EnforcementPicker({ value, onChange }: EnforcementPickerProps) {
  return (
    <SegmentedButtons
      value={value}
      onValueChange={(v) => onChange(v as EnforcementLevel)}
      buttons={ENFORCEMENT_OPTIONS}
      style={styles.picker}
    />
  );
}

const styles = StyleSheet.create({
  picker: {
    marginTop: 4,
  },
});
