import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { colors, fonts, labelStyle, radius } from '../../render/theme';
import { rgba } from '../../render/color';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
  format?: (v: number) => string;
  accent?: string;
}

/**
 * Dependency-free slider built on PanResponder so it can match the instrument
 * styling exactly (RN core no longer ships Slider, and the community package
 * would be another native dependency).
 */
export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  format,
  accent = colors.cyan,
}: SliderProps) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const cfg = useRef({ min, max, step, onChange });
  cfg.current = { min, max, step, onChange };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => apply(e.nativeEvent.locationX),
        onPanResponderMove: (e) => apply(e.nativeEvent.locationX),
      }),
    [],
  );

  function apply(x: number) {
    const w = widthRef.current;
    if (w <= 0) return;
    const { min: lo, max: hi, step: st, onChange: cb } = cfg.current;
    let ratio = Math.min(1, Math.max(0, x / w));
    let next = lo + ratio * (hi - lo);
    if (st && st > 0) next = Math.round(next / st) * st;
    next = Math.min(hi, Math.max(lo, next));
    cb(next);
  }

  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const thumbSize = 14;
  const thumbLeft = Math.min(Math.max(ratio * width - thumbSize / 2, 0), Math.max(0, width - thumbSize));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.header}>
          <Text style={labelStyle}>{label}</Text>
          <Text style={[styles.value, { color: accent }]}>
            {format ? format(value) : value.toFixed(2)}
          </Text>
        </View>
      ) : null}
      <View style={styles.trackHit} onLayout={onLayout} {...responder.panHandlers}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: ratio * width, backgroundColor: rgba(accent, 0.5) }]} />
        </View>
        <View
          style={[
            styles.thumb,
            { left: thumbLeft, width: thumbSize, height: thumbSize, borderColor: accent },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 6 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  value: { fontSize: 12, fontFamily: fonts.mono, fontVariant: ['tabular-nums'] },
  trackHit: { height: 24, justifyContent: 'center' },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.borderBright,
    overflow: 'hidden',
  },
  fill: { height: 3, borderRadius: radius.sm },
  thumb: {
    position: 'absolute',
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: colors.bg,
  },
});
