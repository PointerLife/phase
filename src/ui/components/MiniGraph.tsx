import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Canvas, Path, Rect, Skia } from '@shopify/react-native-skia';
import { colors, fonts, labelStyle } from '../../render/theme';
import { colorOf } from '../../render/color';

export interface GraphSeries {
  values: number[];
  color: string;
}

interface Props {
  series: GraphSeries[];
  height?: number;
  title?: string;
  emptyText?: string;
  formatValue?: (v: number) => string;
}

const PAD_Y = 6;

/** A compact, auto-scaled multi-series sparkline drawn with Skia. */
export function MiniGraph({
  series,
  height = 76,
  title,
  emptyText = 'awaiting data',
  formatValue = (v) => v.toPrecision(3),
}: Props) {
  const [width, setWidth] = useState(0);

  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  for (const s of series) {
    for (const v of s.values) {
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
      count += 1;
    }
  }
  const has = count > 1 && Number.isFinite(min) && Number.isFinite(max);
  if (has && max - min < 1e-9) {
    min -= 0.5;
    max += 0.5;
  }
  const range = has ? max - min : 1;
  const plotH = height - PAD_Y * 2;

  const toY = (v: number) => height - PAD_Y - ((v - min) / range) * plotH;

  const gridPath = has
    ? (() => {
        const p = Skia.PathBuilder.Make();
        for (let i = 0; i <= 4; i++) {
          const y = PAD_Y + (i / 4) * plotH;
          p.moveTo(0, y);
          p.lineTo(width, y);
        }
        return p.build();
      })()
    : null;

  const zeroY = has && min < 0 && max > 0 ? toY(0) : null;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      {title ? (
        <View style={styles.header}>
          <Text style={labelStyle}>{title}</Text>
          {has ? (
            <Text style={styles.range}>
              {formatValue(min)} … {formatValue(max)}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.plot, { height }]} onLayout={onLayout}>
        {width > 0 ? (
          <Canvas style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={width} height={height} color={colorOf(colors.panelAlt)} />
            {gridPath ? (
              <Path path={gridPath} style="stroke" strokeWidth={1} color={colorOf(colors.grid)} />
            ) : null}
            {zeroY != null ? (
              <Rect x={0} y={zeroY} width={width} height={1} color={colorOf(colors.axis)} />
            ) : null}
            {has
              ? series.map((s, si) => {
                  const n = s.values.length;
                  if (n < 2) return null;
                  const p = Skia.PathBuilder.Make();
                  for (let i = 0; i < n; i++) {
                    const v = s.values[i];
                    const x = (i / (n - 1)) * width;
                    const y = toY(Number.isFinite(v) ? v : min);
                    if (i === 0) p.moveTo(x, y);
                    else p.lineTo(x, y);
                  }
                  return (
                    <Path
                      key={si}
                      path={p.build()}
                      style="stroke"
                      strokeWidth={1.5}
                      strokeJoin="round"
                      color={colorOf(s.color)}
                    />
                  );
                })
              : null}
          </Canvas>
        ) : null}
        {!has ? <Text style={styles.empty}>{emptyText}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  range: { color: colors.textFaint, fontSize: 9, fontFamily: fonts.mono },
  plot: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  empty: {
    color: colors.textFaint,
    fontSize: 10,
    fontFamily: fonts.mono,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
