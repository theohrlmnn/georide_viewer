// utils/simplifyPolyline.ts
// Implementation iterative de l'algorithme de Douglas-Peucker pour simplifier une polyligne.
// On travaille en coordonnees geographiques [longitude, latitude] (degres).
// La tolerance est en degres ; 0.00005 ~= 5.5 metres a nos latitudes, invisible sur la carte.

export type LngLat = [number, number];

/**
 * Distance perpendiculaire d'un point p au segment [a, b], en degres.
 * Approximation euclidienne suffisante pour des petites distances (trajets).
 */
function perpDistance(p: LngLat, a: LngLat, b: LngLat): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;

  // Segment degenere : distance point-point
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  // Projection du point sur le segment, clampee sur [0, 1]
  const lenSq = dx * dx + dy * dy;
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;

  const tx = ax + t * dx;
  const ty = ay + t * dy;
  return Math.hypot(px - tx, py - ty);
}

/**
 * Simplifie une polyligne avec Douglas-Peucker (version iterative avec stack
 * pour eviter les stack overflows sur les longs trajets).
 *
 * @param points    Liste ordonnee de coordonnees [lng, lat].
 * @param tolerance Tolerance en degres ; plus elle est grande, plus on simplifie.
 *                  Passer 0 (ou <= 0) pour desactiver.
 * @returns         Sous-ensemble ordonne des points, toujours avec premier et dernier inclus.
 */
export function simplifyDouglasPeucker(points: LngLat[], tolerance: number): LngLat[] {
  if (tolerance <= 0 || points.length <= 2) return points;

  const n = points.length;
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  // Stack de paires [start, end] a traiter
  const stack: Array<[number, number]> = [[0, n - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    if (end - start < 2) continue;

    let maxDist = 0;
    let index = start;
    const a = points[start];
    const b = points[end];

    for (let i = start + 1; i < end; i++) {
      const d = perpDistance(points[i], a, b);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }

    if (maxDist > tolerance) {
      keep[index] = 1;
      stack.push([start, index]);
      stack.push([index, end]);
    }
  }

  const out: LngLat[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) out.push(points[i]);
  }
  return out;
}
