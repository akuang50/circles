import type { TimeWindow } from "./types";

export const STUDY_GROUP_MIN = 2;
export const STUDY_GROUP_MAX = 5;
export const BUDDY_MIN = 2;
export const BUDDY_MAX = 3;

export type Expiring = {
  userId: string;
  expiresAt?: string | null;
};

export function hasActiveOptIn<T extends { expiresAt?: string | null }>(
  signal: T | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!signal) return false;
  if (!signal.expiresAt) return true;
  return new Date(signal.expiresAt).getTime() > now.getTime();
}

/**
 * Mutual-match privacy: never return anyone else's signal unless the viewer
 * currently has an active opt-in of their own.
 */
export function visibleMutualSignals<T extends Expiring>(
  viewerUserId: string,
  viewerSignal: T | null | undefined,
  allSignals: T[],
  now: Date = new Date(),
): T[] {
  if (!hasActiveOptIn(viewerSignal, now)) return [];
  return allSignals.filter(
    (signal) =>
      signal.userId !== viewerUserId && hasActiveOptIn(signal, now),
  );
}

export function windowsOverlap(a: TimeWindow, b: TimeWindow) {
  return a.start < b.end && b.start < a.end;
}

export function anyWindowOverlap(a: TimeWindow[], b: TimeWindow[]) {
  return a.some((left) => b.some((right) => windowsOverlap(left, right)));
}

export function intersectWindows(a: TimeWindow[], b: TimeWindow[]): TimeWindow[] {
  const out: TimeWindow[] = [];
  for (const left of a) {
    for (const right of b) {
      if (!windowsOverlap(left, right)) continue;
      out.push({
        start: left.start > right.start ? left.start : right.start,
        end: left.end < right.end ? left.end : right.end,
      });
    }
  }
  return mergeWindows(out);
}

export function mergeWindows(windows: TimeWindow[]): TimeWindow[] {
  const sorted = [...windows].sort((a, b) => a.start.localeCompare(b.start));
  const merged: TimeWindow[] = [];
  for (const window of sorted) {
    const last = merged[merged.length - 1];
    if (last && window.start <= last.end) {
      last.end = window.end > last.end ? window.end : last.end;
    } else {
      merged.push({ ...window });
    }
  }
  return merged;
}

export function sharedWindows(members: { availableWindows: TimeWindow[] }[]) {
  if (members.length === 0) return [];
  return members
    .slice(1)
    .reduce(
      (acc, member) => intersectWindows(acc, member.availableWindows),
      members[0].availableWindows,
    );
}

export function clusterByOverlap<
  T extends { userId: string; availableWindows: TimeWindow[] },
>(
  requests: T[],
  min = STUDY_GROUP_MIN,
  max = STUDY_GROUP_MAX,
): { members: T[]; windows: TimeWindow[] }[] {
  const remaining = [...requests];
  const groups: { members: T[]; windows: TimeWindow[] }[] = [];

  while (remaining.length >= min) {
    const seed = remaining.shift();
    if (!seed) break;
    const members = [seed];
    for (let i = 0; i < remaining.length && members.length < max; ) {
      const candidate = remaining[i];
      const tentative = [...members, candidate];
      const windows = sharedWindows(tentative);
      if (windows.length > 0) {
        members.push(candidate);
        remaining.splice(i, 1);
      } else {
        i += 1;
      }
    }
    if (members.length >= min) {
      groups.push({ members, windows: sharedWindows(members) });
    } else {
      remaining.push(...members.slice(1));
    }
  }

  return groups;
}

export function chunkMatches<T>(people: T[], min = BUDDY_MIN, max = BUDDY_MAX): T[][] {
  const copy = [...people];
  const groups: T[][] = [];
  while (copy.length >= min) {
    let take = Math.min(max, copy.length);
    const leftover = copy.length - take;
    if (leftover > 0 && leftover < min) {
      take = min;
    }
    groups.push(copy.splice(0, take));
  }
  return groups.filter((group) => group.length >= min);
}

export function meetupNote(location: string, startTime?: string) {
  const where = location.trim() || "the main entrance";
  if (!startTime) return `${where} — 15 minutes before it starts`;
  return `${where}, 15 minutes before ${startTime}`;
}
