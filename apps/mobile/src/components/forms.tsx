import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../theme";

export function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad" | "decimal-pad" | "url";
  placeholder?: string;
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.green }}
      />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function ChipWrap({ children }: { children: ReactNode }) {
  return <View style={styles.chipWrap}>{children}</View>;
}

export function SaveButton({
  label,
  busy,
  onPress,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.save, busy && styles.saveBusy]}
    >
      {busy ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.saveText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function StatusText({
  error,
  saved,
}: {
  error: string | null;
  saved: string | null;
}) {
  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }
  if (saved) {
    return <Text style={styles.saved}>{saved}</Text>;
  }
  return null;
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleCopy: { flex: 1 },
  toggleLabel: { fontSize: 16, fontWeight: "600", color: colors.ink },
  hint: { marginTop: 4, fontSize: 13, color: colors.muted, lineHeight: 18 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.ink, fontWeight: "600" },
  chipTextSelected: { color: colors.white },
  save: {
    marginTop: 8,
    backgroundColor: colors.night,
    borderRadius: 999,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBusy: { opacity: 0.6 },
  saveText: { color: colors.lime, fontSize: 16, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 14 },
  saved: { color: colors.green, fontSize: 14, fontWeight: "600" },
});
