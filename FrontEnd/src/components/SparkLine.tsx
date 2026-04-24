import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

interface Props {
  data: number[];
  color?: string;
  height?: number;
}

const SparkLine: React.FC<Props> = ({ data, color, height = 40 }) => {
  const { colors } = useTheme();
  const barColor = color ?? colors.primary;

  if (!data.length) return <View style={{ height }} />;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <View style={[styles.container, { height }]}>
      {data.map((val, i) => {
        const ratio = (val - min) / range;
        const barHeight = Math.max(ratio * height, 3);
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: barColor,
                opacity: 0.45 + ratio * 0.55,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    flex: 1,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
});

export default SparkLine;
