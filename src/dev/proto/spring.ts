// A damped spring rendered as a CSS linear() easing, so WAAPI can run it on the
// compositor while still inheriting the gesture's release velocity.
// Parameters follow Apple's model: response (s) and damping ratio (1 = no overshoot).

export type SpringOptions = {
  response?: number; // seconds
  damping?: number; // ratio, 0–1
  /** Initial velocity in progress units per second: gestureVelocity / (target − current). */
  velocity?: number;
};

export function springCurve({ response = 0.35, damping = 1, velocity = 0 }: SpringOptions = {}) {
  const w = (2 * Math.PI) / response;
  const z = Math.min(1, Math.max(0, damping));
  const v0 = velocity;
  // Displacement d(t) = p(t) − 1, with d(0) = −1, d'(0) = v0.
  let d: (t: number) => number;
  let envelope: (t: number) => number;
  if (z >= 1) {
    const c2 = v0 - w;
    d = (t) => (-1 + c2 * t) * Math.exp(-w * t);
    envelope = (t) => (1 + Math.abs(c2) * t) * Math.exp(-w * t);
  } else {
    const wd = w * Math.sqrt(1 - z * z);
    const c2 = (v0 - z * w) / wd;
    d = (t) => Math.exp(-z * w * t) * (-Math.cos(wd * t) + c2 * Math.sin(wd * t));
    envelope = (t) => Math.exp(-z * w * t) * (1 + Math.abs(c2));
  }
  let T = 0.016;
  while (envelope(T) > 0.001 && T < 3) T += 0.004;
  const N = 48;
  const points = Array.from({ length: N + 1 }, (_, i) => +(1 + d((T * i) / N)).toFixed(4));
  points[0] = 0;
  points[N] = 1;
  return { easing: `linear(${points.join(', ')})`, durationMs: Math.round(T * 1000), points };
}

/** Progressive resistance past a boundary (Apple's rubber-band). */
export function rubberband(overshoot: number, dimension: number, c = 0.55): number {
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}
