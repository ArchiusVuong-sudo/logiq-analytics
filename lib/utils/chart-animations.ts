// Shared Chart.js animation presets — bar stagger, line progressive draw, pie sweep, hover pulse.
import type { ChartType, ChartOptions } from 'chart.js';

export type AnimSpec = ChartOptions['animation'];

// Bars rise from y=0 with a stagger across the dataset (perfect for column/bar charts).
export const barAnimation = {
  duration: 900,
  easing: 'easeOutQuart' as const,
  delay: (ctx: any) => {
    if (ctx.type === 'data' && ctx.mode === 'default' && !ctx.dropped) {
      ctx.dropped = true;
      return ctx.dataIndex * 70 + (ctx.datasetIndex || 0) * 50;
    }
    return 0;
  },
};

// Progressive line draw: each subsequent point appears with a small delay so the line "draws" left-to-right.
// Combined with a slight y-offset for a subtle settle.
export function progressiveLineAnimation(pointCount: number, totalDuration = 1400) {
  const per = pointCount > 0 ? totalDuration / pointCount : 200;
  return {
    x: {
      type: 'number' as const,
      easing: 'easeOutCubic' as const,
      duration: per,
      from: NaN,
      delay(ctx: any) {
        if (ctx.type !== 'data' || ctx.xStarted) return 0;
        ctx.xStarted = true;
        return ctx.dataIndex * per;
      },
    },
    y: {
      type: 'number' as const,
      easing: 'easeOutCubic' as const,
      duration: per,
      from: (ctx: any) => (ctx.index === 0 ? ctx.chart.scales.y?.getPixelForValue(100) : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1]?.getProps(['y'], true).y),
      delay(ctx: any) {
        if (ctx.type !== 'data' || ctx.yStarted) return 0;
        ctx.yStarted = true;
        return ctx.dataIndex * per;
      },
    },
  } as AnimSpec;
}

// Pie / doughnut clockwise sweep with rotation easing.
export const pieAnimation = {
  animateRotate: true,
  animateScale: false,
  duration: 1200,
  easing: 'easeOutCubic' as const,
};

// Build a vertical gradient bg for a line/area dataset using the chart context.
export function makeAreaGradient(chart: any, color1 = 'rgba(124,92,255,0.55)', color2 = 'rgba(124,92,255,0)') {
  const { ctx, chartArea } = chart;
  if (!chartArea) return color1;
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, color1);
  g.addColorStop(1, color2);
  return g;
}

export function makeBarGradient(chart: any, color1 = '#7c5cff', color2 = '#46d9ff') {
  const { ctx, chartArea } = chart;
  if (!chartArea) return color1;
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, color1 + 'cc');
  g.addColorStop(1, color2 + '55');
  return g;
}

// Pick the right animation based on chart type
export function chartAnimationFor(type: ChartType, pointCount = 0): AnimSpec {
  if (type === 'bar') return barAnimation as AnimSpec;
  if (type === 'pie' || type === 'doughnut' || type === 'polarArea') return pieAnimation as AnimSpec;
  if (type === 'line') {
    return {
      duration: 1200,
      easing: 'easeOutCubic',
      ...progressiveLineAnimation(pointCount, Math.min(1500, pointCount * 80)),
    } as AnimSpec;
  }
  return { duration: 800, easing: 'easeOutCubic' } as AnimSpec;
}

// Common interactivity polish
export const hoverPolish = {
  hover: { mode: 'nearest' as const, intersect: false, animationDuration: 200 },
  interaction: { mode: 'nearest' as const, intersect: false, axis: 'x' as const },
};
