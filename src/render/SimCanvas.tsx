import { memo, useMemo, useRef } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  Rect,
  Skia,
  Text as SkText,
  matchFont,
  vec,
  type SkFont,
  type SkPath,
} from '@shopify/react-native-skia';
import { colors, fonts } from './theme';
import { colorOf } from './color';
import { useStore, useRenderVersion } from '../sim/SimulationContext';
import type { Body } from '../physics/types';
import type { Trail } from '../sim/trail';

const TRAIL_CHUNKS = 6;
const TARGET_GRID_PX = 78;

function niceStep(x: number): number {
  if (!Number.isFinite(x) || x <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / p;
  const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return m * p;
}

function formatTick(v: number, step: number): string {
  if (step >= 1) return v.toFixed(0);
  const decimals = Math.min(3, Math.max(0, Math.ceil(-Math.log10(step))));
  return v.toFixed(decimals);
}

interface GridProps {
  scale: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  font: SkFont | null;
}

/** Grid, axes and coordinate ticks. Memoised: only rebuilt when the view moves. */
const GridLayer = memo(function GridLayer({ scale, cx, cy, w, h, font }: GridProps) {
  const built = useMemo(() => {
    const stepWorld = niceStep(TARGET_GRID_PX / scale);
    const left = cx - w / 2 / scale;
    const right = cx + w / 2 / scale;
    const bottom = cy - h / 2 / scale;
    const top = cy + h / 2 / scale;

    const minor = Skia.PathBuilder.Make();
    const major = Skia.PathBuilder.Make();
    const labels: Array<{ x: number; y: number; text: string; ax: boolean }> = [];

    const axisScreenX = (0 - cx) * scale + w / 2;
    const axisScreenY = h / 2 - (0 - cy) * scale;
    const labelX = Math.min(Math.max(axisScreenX + 3, 2), w - 34);
    const labelY = Math.min(Math.max(axisScreenY + 11, 11), h - 3);

    const firstX = Math.ceil(left / stepWorld) * stepWorld;
    for (let x = firstX; x <= right; x += stepWorld) {
      const sx = (x - cx) * scale + w / 2;
      const majorTick = Math.round(x / stepWorld) % 5 === 0;
      const path = majorTick ? major : minor;
      path.moveTo(sx, 0);
      path.lineTo(sx, h);
      if (majorTick && font) {
        labels.push({ x: sx + 3, y: labelY, text: formatTick(x, stepWorld), ax: true });
      }
    }

    const firstY = Math.ceil(bottom / stepWorld) * stepWorld;
    for (let y = firstY; y <= top; y += stepWorld) {
      const sy = h / 2 - (y - cy) * scale;
      const majorTick = Math.round(y / stepWorld) % 5 === 0;
      const path = majorTick ? major : minor;
      path.moveTo(0, sy);
      path.lineTo(w, sy);
      if (majorTick && font && Math.abs(y) > 1e-9) {
        labels.push({ x: labelX, y: sy - 3, text: formatTick(y, stepWorld), ax: false });
      }
    }

    const axes = Skia.PathBuilder.Make();
    axes.moveTo(axisScreenX, 0);
    axes.lineTo(axisScreenX, h);
    axes.moveTo(0, axisScreenY);
    axes.lineTo(w, axisScreenY);

    return { minor: minor.build(), major: major.build(), axes: axes.build(), labels, stepWorld };
  }, [scale, cx, cy, w, h, font]);

  return (
    <Group>
      <Path path={built.minor} style="stroke" strokeWidth={1} color={colorOf(colors.grid)} />
      <Path path={built.major} style="stroke" strokeWidth={1} color={colorOf(colors.gridMajor)} />
      <Path path={built.axes} style="stroke" strokeWidth={1} color={colorOf(colors.axis)} />
      {font
        ? built.labels.map((l, i) => (
            <SkText
              key={i}
              x={l.x}
              y={l.y}
              text={l.text}
              font={font}
              color={colorOf(colors.textFaint)}
            />
          ))
        : null}
    </Group>
  );
});

function trailPaths(trail: Trail, hex: string, scale: number, cx: number, cy: number, w: number, h: number) {
  const out: Array<{ path: SkPath; color: Float32Array }> = [];
  const n = trail.count;
  if (n < 2) return out;
  const data = trail.data;
  const start = trail.start;
  const cap = trail.capacity;
  const toScreenX = (wx: number) => (wx - cx) * scale + w / 2;
  const toScreenY = (wy: number) => h / 2 - (wy - cy) * scale;

  const per = Math.ceil(n / TRAIL_CHUNKS);
  let prevX = 0;
  let prevY = 0;
  let has = false;
  for (let c = 0; c < TRAIL_CHUNKS; c++) {
    const from = c * per;
    const to = Math.min(n - 1, (c + 1) * per);
    if (from >= to) break;
    const path = Skia.PathBuilder.Make();
    if (has) path.moveTo(prevX, prevY);
    for (let i = from; i <= to; i++) {
      const idx = ((start + i) % cap) * 2;
      const sx = toScreenX(data[idx]);
      const sy = toScreenY(data[idx + 1]);
      if (i === from && !has) path.moveTo(sx, sy);
      else path.lineTo(sx, sy);
      prevX = sx;
      prevY = sy;
    }
    has = true;
    const age = (c + 1) / TRAIL_CHUNKS;
    out.push({ path: path.build(), color: colorOf(hex, 0.05 + 0.4 * age) });
  }
  return out;
}

interface GestureState {
  mode: 'none' | 'pan' | 'drag' | 'pinch';
  dragId: string | null;
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
  moved: boolean;
  pinchDist: number;
  lastMidX: number;
  lastMidY: number;
}

export function SimCanvas() {
  const store = useStore();
  // Subscribe to the per-frame render tick; the canvas is the only subtree that
  // re-renders at frame rate.
  useRenderVersion();

  const sizeRef = useRef({ w: 0, h: 0 });
  const gestureRef = useRef<GestureState>({
    mode: 'none',
    dragId: null,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
    moved: false,
    pinchDist: 0,
    lastMidX: 0,
    lastMidY: 0,
  });

  const font = useMemo<SkFont | null>(() => {
    try {
      return (
        matchFont({
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
          fontSize: 9,
        }) ?? null
      );
    } catch {
      return null;
    }
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          const g = gestureRef.current;
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            g.mode = 'pinch';
            g.pinchDist = Math.hypot(
              touches[0].locationX - touches[1].locationX,
              touches[0].locationY - touches[1].locationY,
            );
            g.lastMidX = (touches[0].locationX + touches[1].locationX) / 2;
            g.lastMidY = (touches[0].locationY + touches[1].locationY) / 2;
            g.moved = true;
            return;
          }
          const sx = evt.nativeEvent.locationX;
          const sy = evt.nativeEvent.locationY;
          const world = store.screenToWorld(sx, sy);
          const tol = 14 / store.getViewport().scale;
          const hit = store.pickBody(world.x, world.y, tol);
          if (hit) {
            store.select(hit.id);
            store.pause();
            g.mode = 'drag';
            g.dragId = hit.id;
          } else {
            g.mode = 'pan';
            g.dragId = null;
          }
          g.lastX = sx;
          g.lastY = sy;
          g.startX = sx;
          g.startY = sy;
          g.moved = false;
        },
        onPanResponderMove: (evt) => {
          const g = gestureRef.current;
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            const dist = Math.hypot(
              touches[0].locationX - touches[1].locationX,
              touches[0].locationY - touches[1].locationY,
            );
            const midX = (touches[0].locationX + touches[1].locationX) / 2;
            const midY = (touches[0].locationY + touches[1].locationY) / 2;
            if (g.mode !== 'pinch') {
              g.mode = 'pinch';
              g.pinchDist = dist;
              g.lastMidX = midX;
              g.lastMidY = midY;
              g.moved = true;
              return;
            }
            if (g.pinchDist > 0 && Number.isFinite(dist)) {
              store.zoomAt(midX, midY, dist / g.pinchDist);
            }
            store.panBy(midX - g.lastMidX, midY - g.lastMidY);
            g.pinchDist = dist;
            g.lastMidX = midX;
            g.lastMidY = midY;
            g.moved = true;
            return;
          }
          if (touches.length === 0) return;
          const sx = touches[0].locationX;
          const sy = touches[0].locationY;
          if (g.mode === 'pinch') {
            g.mode = 'pan';
            g.lastX = sx;
            g.lastY = sy;
            return;
          }
          const dx = sx - g.lastX;
          const dy = sy - g.lastY;
          if (Math.abs(sx - g.startX) + Math.abs(sy - g.startY) > 6) g.moved = true;
          if (g.mode === 'drag' && g.dragId) {
            const world = store.screenToWorld(sx, sy);
            store.moveBodyTo(g.dragId, world.x, world.y);
          } else if (g.mode === 'pan') {
            store.panBy(dx, dy);
          }
          g.lastX = sx;
          g.lastY = sy;
        },
        onPanResponderRelease: (evt) => {
          const g = gestureRef.current;
          if (g.mode === 'pan' && !g.moved) {
            const world = store.screenToWorld(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
            const tol = 14 / store.getViewport().scale;
            const hit = store.pickBody(world.x, world.y, tol);
            store.select(hit ? hit.id : null);
          }
          g.mode = 'none';
          g.dragId = null;
          g.moved = false;
        },
        onPanResponderTerminate: () => {
          const g = gestureRef.current;
          g.mode = 'none';
          g.dragId = null;
          g.moved = false;
        },
      }),
    [store],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { w: width, h: height };
    store.setCanvasSize(width, height);
  };

  const { w, h } = sizeRef.current;
  const vp = store.getViewport();
  const bodies = store.getBodies();
  const selectedId = store.getSelectedId();
  const gridStep = niceStep(TARGET_GRID_PX / vp.scale);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {w > 0 && h > 0 ? (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect x={0} y={0} width={w} height={h} color={colorOf(colors.bg)} />
          <GridLayer scale={vp.scale} cx={vp.cx} cy={vp.cy} w={w} h={h} font={font} />
          {bodies.map((b: Body) => {
            const trail = store.getTrail(b.id);
            if (!trail) return null;
            const segs = trailPaths(trail, b.color, vp.scale, vp.cx, vp.cy, w, h);
            return (
              <Group key={`t-${b.id}`}>
                {segs.map((s, i) => (
                  <Path
                    key={i}
                    path={s.path}
                    style="stroke"
                    strokeWidth={1.4}
                    strokeCap="round"
                    color={s.color}
                  />
                ))}
              </Group>
            );
          })}
          {bodies.map((b: Body) => {
            const sx = (b.x - vp.cx) * vp.scale + w / 2;
            const sy = h / 2 - (b.y - vp.cy) * vp.scale;
            const r = Math.max(1.5, Math.min(b.radius * vp.scale, 8000));
            const glowR = r * 2.8;
            const selected = b.id === selectedId;
            return (
              <Group key={b.id}>
                <Circle cx={sx} cy={sy} r={glowR}>
                  <RadialGradient
                    c={vec(sx, sy)}
                    r={glowR}
                    colors={[colorOf(b.color, 0.5), colorOf(b.color, 0)]}
                  />
                </Circle>
                <Circle cx={sx} cy={sy} r={r} color={colorOf(b.color)} />
                <Circle
                  cx={sx}
                  cy={sy}
                  r={Math.max(r - 0.5, 0.5)}
                  style="stroke"
                  strokeWidth={1}
                  color={colorOf('#FFFFFF', 0.45)}
                />
                {b.fixed ? (
                  <Circle
                    cx={sx}
                    cy={sy}
                    r={r + 4}
                    style="stroke"
                    strokeWidth={1}
                    color={colorOf(colors.amber, 0.75)}
                  />
                ) : null}
                {selected ? (
                  <>
                    <Circle
                      cx={sx}
                      cy={sy}
                      r={r + 7}
                      style="stroke"
                      strokeWidth={1.2}
                      color={colorOf(colors.cyan, 0.95)}
                    />
                    {font ? (
                      <SkText
                        x={sx + r + 10}
                        y={sy - r - 6}
                        text={b.name.toUpperCase()}
                        font={font}
                        color={colorOf(colors.cyan, 0.9)}
                      />
                    ) : null}
                  </>
                ) : null}
              </Group>
            );
          })}
        </Canvas>
      ) : null}

      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />

      <View style={styles.legend} pointerEvents="none">
        <Text style={styles.legendText}>
          GRID {formatTick(gridStep, gridStep)} wu · {(vp.scale).toFixed(2)} px/wu
        </Text>
        <Text style={styles.legendText}>
          ORIGIN {vp.cx.toFixed(0)}, {vp.cy.toFixed(0)} wu
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  legend: {
    position: 'absolute',
    left: 10,
    bottom: 8,
    gap: 1,
  },
  legendText: {
    color: colors.textFaint,
    fontSize: 9,
    letterSpacing: 0.8,
    fontFamily: fonts.mono,
  },
});
