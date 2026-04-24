import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import type { BlueprintData, BlueprintFeature } from '../models/types';

const WALL = 5;
const DOOR_GAP_RATIO = 0.14;  // 14% of wall length
const WINDOW_GAP_RATIO = 0.09; // 9% of wall length

const SEG_COLORS = {
  wall: '#334155',
  door: '#10B981',
  window: '#60A5FA',
} as const;

interface Segment {
  start: number;
  length: number;
  type: 'wall' | 'door' | 'window';
}

function buildSegments(
  wallLength: number,
  features: BlueprintFeature[],
  dg: number,
  wg: number,
): Segment[] {
  const sorted = [...features].sort((a, b) => a.offset - b.offset);
  const segs: Segment[] = [];
  let cursor = 0;

  for (const f of sorted) {
    const gap = f.type === 'door' ? dg : wg;
    const center = f.offset * wallLength;
    const gStart = Math.max(cursor, center - gap / 2);
    const gEnd = Math.min(wallLength, center + gap / 2);
    if (gStart >= gEnd) continue;
    if (cursor < gStart) segs.push({ start: cursor, length: gStart - cursor, type: 'wall' });
    segs.push({ start: gStart, length: gEnd - gStart, type: f.type });
    cursor = gEnd;
  }
  if (cursor < wallLength) segs.push({ start: cursor, length: wallLength - cursor, type: 'wall' });
  return segs;
}

const BlueprintBackground: React.FC<{ blueprint: BlueprintData }> = ({ blueprint }) => {
  const [size, setSize] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setSize((prev) => (prev === w ? prev : w));
  }, []);

  const dg = size * DOOR_GAP_RATIO;
  const wg = size * WINDOW_GAP_RATIO;

  const renderWall = (wall: 'top' | 'bottom' | 'left' | 'right') => {
    const isH = wall === 'top' || wall === 'bottom';
    const features = blueprint.features.filter((f) => f.wall === wall);
    const segments = buildSegments(size, features, dg, wg);

    return segments.map((seg, i) => {
      const color = SEG_COLORS[seg.type];
      const s: Record<string, string | number> = {
        position: 'absolute',
        backgroundColor: color,
      };
      if (isH) {
        s[wall] = 0;
        s.left = seg.start;
        s.width = seg.length;
        s.height = WALL;
      } else {
        s[wall] = 0;
        s.top = seg.start;
        s.width = WALL;
        s.height = seg.length;
      }
      return <View key={`${wall}-${i}`} style={s as any} />;
    });
  };

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {/* Floor tint */}
      <View style={[StyleSheet.absoluteFill, styles.floor]} />
      {size > 0 && (
        <>
          {renderWall('top')}
          {renderWall('bottom')}
          {renderWall('left')}
          {renderWall('right')}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  floor: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
});

export default BlueprintBackground;
