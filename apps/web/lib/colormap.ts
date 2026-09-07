export type RGB = [number, number, number];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function multiStop(stops: RGB[], t: number): RGB {
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const localT = scaled - idx;
  return lerpColor(stops[idx], stops[idx + 1], localT);
}

const CO2_STOPS: RGB[] = [
  [5, 10, 20],
  [13, 42, 74],
  [27, 111, 140],
  [59, 199, 244],
  [175, 238, 255],
];

const CH4_STOPS: RGB[] = [
  [8, 6, 4],
  [74, 45, 15],
  [180, 100, 20],
  [245, 166, 35],
  [255, 224, 150],
];

const MONO_STOPS: RGB[] = [
  [8, 10, 16],
  [45, 52, 74],
  [91, 124, 250],
  [180, 200, 255],
];

export function colorFor(gas: "CO2" | "CH4" | "mono", t: number): RGB {
  const stops = gas === "CO2" ? CO2_STOPS : gas === "CH4" ? CH4_STOPS : MONO_STOPS;
  return multiStop(stops, t);
}

export function rgbToCss([r, g, b]: RGB, alpha = 1): string {
  return `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, ${alpha})`;
}

export function normalize(grid: number[][]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const row of grid) {
    for (const v of row) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { min, max };
}
