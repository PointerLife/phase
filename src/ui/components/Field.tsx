import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { colors, fonts, labelStyle, radius, space } from '../../render/theme';
import { rgba } from '../../render/color';
import { Btn } from './Primitives';

export function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return '0';
  const a = Math.abs(v);
  if (a !== 0 && (a < 0.001 || a >= 1e6)) return v.toExponential(2);
  return String(Math.round(v * 10000) / 10000);
}

function clampTo(v: number, min?: number, max?: number): number {
  let out = v;
  if (min != null) out = Math.max(min, out);
  if (max != null) out = Math.min(max, out);
  return out;
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  allowNegative = true,
  suffix,
  keyboardType = 'numbers-and-punctuation',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  const [text, setText] = useState(() => formatNumber(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatNumber(value));
  }, [value, focused]);

  const commit = () => {
    const parsed = parseFloat(text);
    if (Number.isFinite(parsed)) {
      const next = clampTo(parsed, min, max);
      onChange(next);
      setText(formatNumber(next));
    } else {
      setText(formatNumber(value));
    }
  };

  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.inputWrap}>
        {allowNegative ? (
          <Pressable
            hitSlop={6}
            onPress={() => {
              const next = clampTo(-value, min, max);
              onChange(next);
              setText(formatNumber(next));
            }}
            style={styles.signBtn}
          >
            <Text style={styles.signLabel}>±</Text>
          </Pressable>
        ) : null}
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onSubmitEditing={() => {
            setFocused(false);
            commit();
          }}
          keyboardType={keyboardType}
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor={colors.cyan}
          style={styles.input}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 24,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value);
  }, [value, focused]);

  const commit = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0) onChange(trimmed);
    else setText(value);
  };

  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, { minWidth: 160 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onSubmitEditing={() => {
            setFocused(false);
            commit();
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          autoCorrect={false}
          maxLength={maxLength}
          selectionColor={colors.cyan}
          style={[styles.input, { textAlign: 'left' }]}
        />
      </View>
    </View>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  format,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  format?: (v: T) => string;
}) {
  return (
    <View style={styles.segWrap}>
      {label ? <Text style={[labelStyle, { marginBottom: 4 }]}>{label}</Text> : null}
      <View style={styles.segRow}>
        {options.map((o) => {
          const active = o === value;
          return (
            <Pressable
              key={String(o)}
              onPress={() => onChange(o)}
              style={[
                styles.segItem,
                active ? { borderColor: rgba(colors.cyan, 0.6), backgroundColor: rgba(colors.cyan, 0.12) } : null,
              ]}
            >
              <Text style={[styles.segText, active ? { color: colors.cyan } : null]}>
                {format ? format(o) : String(o)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => onChange(!value)}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.toggleTrack, value ? styles.toggleOn : null]}>
        <View style={[styles.toggleThumb, value ? styles.toggleThumbOn : null]} />
      </View>
    </Pressable>
  );
}

export function ModalCard({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.cardTitle}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function NamePrompt({
  visible,
  title,
  initial = '',
  placeholder = 'Experiment name',
  submitLabel = 'Save',
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  title: string;
  initial?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const lastVisible = useRef(false);
  useEffect(() => {
    if (visible && !lastVisible.current) setText(initial);
    lastVisible.current = visible;
  }, [visible, initial]);

  const submit = () => {
    const name = text.trim();
    if (name.length === 0) return;
    onSubmit(name);
  };

  return (
    <ModalCard visible={visible} title={title} onClose={onCancel}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={styles.nameInput}
        selectionColor={colors.cyan}
        autoFocus
        maxLength={40}
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      <View style={styles.modalActions}>
        <Btn label="Cancel" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Btn
          label={submitLabel}
          variant="primary"
          onPress={submit}
          disabled={text.trim().length === 0}
          style={{ flex: 1 }}
        />
      </View>
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginBottom: 6,
  },
  fieldLabel: { ...labelStyle, flexShrink: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.md,
    backgroundColor: colors.panelAlt,
    paddingHorizontal: 6,
    height: 32,
    minWidth: 120,
    gap: 4,
  },
  signBtn: { paddingHorizontal: 2 },
  signLabel: { color: colors.textDim, fontSize: 14, fontFamily: fonts.mono },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontFamily: fonts.mono,
    padding: 0,
    textAlign: 'right',
  },
  suffix: { color: colors.textFaint, fontSize: 9, fontFamily: fonts.mono },
  segWrap: { marginBottom: 6 },
  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segItem: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderBright,
    backgroundColor: colors.panelAlt,
  },
  segText: { color: colors.textDim, fontSize: 11, fontFamily: fonts.mono },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.panelAlt,
    borderWidth: 1,
    borderColor: colors.borderBright,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: rgba(colors.cyan, 0.18), borderColor: rgba(colors.cyan, 0.6) },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.textDim,
  },
  toggleThumbOn: { backgroundColor: colors.cyan, alignSelf: 'flex-end' },
  backdrop: {
    flex: 1,
    backgroundColor: rgba(colors.black, 0.72),
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: space.md,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.md,
    backgroundColor: colors.panelAlt,
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 14,
    paddingHorizontal: space.md,
    height: 44,
  },
  modalActions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
});
