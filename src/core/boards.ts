import { PLACE_COPY } from "./copy";
import { hasActiveOptIn } from "./matching";
import { localDateISO } from "./time";
import type {
  CircleMeeting,
  CircleNotice,
  PlaceKind,
  PresenceCheckIn,
  PresenceExpiryOption,
  PsetClaim,
} from "./types";

export function expiryFromOption(
  option: PresenceExpiryOption,
  now = new Date(),
): string | null {
  if (option === "until_cleared") return null;
  const hours = option === "2h" ? 2 : 4;
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function activeCheckIns(
  rows: PresenceCheckIn[],
  now = new Date(),
): PresenceCheckIn[] {
  return rows.filter((row) => hasActiveOptIn(row, now));
}

export function placeGroupKey(placeKind: PlaceKind, placeLabel: string) {
  return `${placeKind}:${placeLabel.trim().toLowerCase()}`;
}

export function groupCheckInsByPlace(rows: PresenceCheckIn[]) {
  const groups = new Map<
    string,
    { key: string; placeKind: PlaceKind; placeLabel: string; people: PresenceCheckIn[] }
  >();
  for (const row of rows) {
    const key = placeGroupKey(row.placeKind, row.placeLabel);
    const existing = groups.get(key);
    if (existing) {
      existing.people.push(row);
    } else {
      groups.set(key, {
        key,
        placeKind: row.placeKind,
        placeLabel: row.placeLabel,
        people: [row],
      });
    }
  }
  return [...groups.values()].sort((a, b) => {
    if (b.people.length !== a.people.length) return b.people.length - a.people.length;
    return a.placeLabel.localeCompare(b.placeLabel);
  });
}

export function presetPlaceLabel(kind: PlaceKind, custom = "") {
  if (kind === "custom") return custom.trim();
  return PLACE_COPY[kind];
}

export function claimsByPset(claims: PsetClaim[]) {
  const map = new Map<string, PsetClaim[]>();
  for (const claim of claims) {
    const list = map.get(claim.psetId) ?? [];
    list.push(claim);
    map.set(claim.psetId, list);
  }
  return map;
}

export function upcomingMeetings(meetings: CircleMeeting[], today = localDateISO()) {
  return meetings
    .filter((row) => row.date >= today)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
}

export function sortNoticesNewest(notices: CircleNotice[]) {
  return [...notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
