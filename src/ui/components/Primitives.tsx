import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, labelStyle, radius, space } from '../../render/theme';
import { rgba } from '../../render/color';

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={labelStyle}>{children}</Text>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

export function Panel({
  title,
  right,
  children,
  style,
  padded = true,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return (
    <View style={[styles.panel, style]}>
      {title ? (
        <View style={styles.panelHeader}>
          <Text style={labelStyle}>{title}</Text>
          {right ? <View>{right}</View> : null}
        </View>
      ) : null}
      <View style={padded ? styles.panelBody : undefined}>{children}</View>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function Readout({
  label,
  value,
  unit,
  color,
  flex = 1,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
  flex?: number;
}) {
  return (
    <View style={{ flex, minWidth: 0 }}>
      <Text style={styles.readoutLabel}>{label}</Text>
      <View style={styles.readoutValueRow}>
        <Text style={[styles.readoutValue, color ? { color } : null]} numberOfLines={1}>
          {value}
        </Text>
        {unit ? <Text style={styles.readoutUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

type BtnVariant = 'default' | 'primary' | 'danger' | 'ghost';

export function Btn({
  label,
  onPress,
  variant = 'default',
  disabled,
  style,
  compact,
}: {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const tint =
    variant === 'primary'
      ? colors.cyan
      : variant === 'danger'
        ? colors.red
        : variant === 'ghost'
          ? colors.textDim
          : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        variant === 'primary' && styles.btnPrimary,
        variant === 'danger' && styles.btnDanger,
        variant === 'ghost' && styles.btnGhost,
        pressed && !disabled && styles.btnPressed,
        disabled && styles.btnDisabled,
        style,
      ]}
    >
      <Text style={[styles.btnLabel, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const tint = color ?? colors.cyan;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active ? { borderColor: tint, backgroundColor: rgba(tint, 0.12) } : null,
      ]}
    >
      <Text style={[styles.chipLabel, active ? { color: tint } : null]}>{label}</Text>
    </Pressable>
  );
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: 4,
      }}
    />
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  panelBody: {
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: space.sm,
  },
  readoutLabel: {
    ...labelStyle,
    fontSize: 9,
    marginBottom: 3,
  },
  readoutValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  readoutValue: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.mono,
    fontVariant: ['tabular-nums'],
  },
  readoutUnit: { color: colors.textFaint, fontSize: 9, fontFamily: fonts.mono },
  btn: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompact: { paddingHorizontal: space.sm + 2, paddingVertical: space.sm },
  btnPrimary: { borderColor: rgba(colors.cyan, 0.55), backgroundColor: rgba(colors.cyan, 0.1) },
  btnDanger: { borderColor: rgba(colors.red, 0.5), backgroundColor: rgba(colors.red, 0.08) },
  btnGhost: { borderColor: 'transparent', backgroundColor: 'transparent' },
  btnPressed: { opacity: 0.6 },
  btnDisabled: { opacity: 0.35 },
  btnLabel: { fontSize: 11, letterSpacing: 1.1, fontWeight: '600', textTransform: 'uppercase' },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    backgroundColor: colors.panelAlt,
  },
  chipLabel: {
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 0.8,
    fontFamily: fonts.mono,
  },
});
