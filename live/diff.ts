/** Structural diff between two kernel receipt snapshots. Pure. */
export type SnapshotChange = { path: string; before: unknown; after: unknown };

export function diffSnapshots(before: unknown, after: unknown, path = ""): SnapshotChange[] {
  if (Object.is(before, after)) return [];
  const isObj = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === "object";
  if (Array.isArray(before) && Array.isArray(after)) {
    const out: SnapshotChange[] = [];
    const n = Math.max(before.length, after.length);
    for (let i = 0; i < n; i++) out.push(...diffSnapshots(before[i], after[i], `${path}[${i}]`));
    return out;
  }
  if (isObj(before) && isObj(after) && !Array.isArray(before) && !Array.isArray(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return keys.flatMap((k) => diffSnapshots(before[k], after[k], path ? `${path}.${k}` : k));
  }
  return [{ path: path || "$", before: before ?? null, after: after ?? null }];
}
