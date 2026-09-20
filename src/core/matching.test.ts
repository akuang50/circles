import { describe, expect, it } from "vitest";
import {
  anyWindowOverlap,
  chunkMatches,
  clusterByOverlap,
  hasActiveOptIn,
  meetupNote,
  visibleMutualSignals,
} from "./matching";

const future = new Date(Date.now() + 60_000).toISOString();
const past = new Date(Date.now() - 60_000).toISOString();

describe("mutual-match privacy", () => {
  it("hides everyone when the viewer has not opted in", () => {
    const others = [{ userId: "maya", expiresAt: future }];
    expect(visibleMutualSignals("you", null, others)).toEqual([]);
  });

  it("hides everyone when the viewer’s signal is expired", () => {
    const mine = { userId: "you", expiresAt: past };
    const others = [{ userId: "maya", expiresAt: future }];
    expect(visibleMutualSignals("you", mine, others)).toEqual([]);
  });

  it("returns only active others after the viewer opts in", () => {
    const mine = { userId: "you", expiresAt: future };
    const others = [
      { userId: "you", expiresAt: future },
      { userId: "maya", expiresAt: future },
      { userId: "jonah", expiresAt: past },
    ];
    expect(visibleMutualSignals("you", mine, others)).toEqual([
      { userId: "maya", expiresAt: future },
    ]);
  });

  it("treats a missing expiry as still active", () => {
    expect(hasActiveOptIn({ userId: "you" })).toBe(true);
  });
});

describe("study windows", () => {
  it("detects overlapping review windows", () => {
    expect(
      anyWindowOverlap(
        [{ start: "18:00", end: "21:00" }],
        [{ start: "19:00", end: "22:00" }],
      ),
    ).toBe(true);
    expect(
      anyWindowOverlap(
        [{ start: "10:00", end: "12:00" }],
        [{ start: "13:00", end: "15:00" }],
      ),
    ).toBe(false);
  });

  it("forms a group only when windows overlap for 2+ people", () => {
    const groups = clusterByOverlap([
      {
        userId: "a",
        availableWindows: [{ start: "18:00", end: "21:00" }],
      },
      {
        userId: "b",
        availableWindows: [{ start: "19:00", end: "22:00" }],
      },
      {
        userId: "c",
        availableWindows: [{ start: "08:00", end: "09:00" }],
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].members.map((m) => m.userId).sort()).toEqual(["a", "b"]);
    expect(groups[0].windows[0]).toEqual({ start: "19:00", end: "21:00" });
  });
});

describe("event buddy grouping", () => {
  it("prefers two pairs over a leftover of one", () => {
    expect(chunkMatches(["a", "b", "c", "d"])).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("forms a trio when that uses everyone", () => {
    expect(chunkMatches(["a", "b", "c"])).toEqual([["a", "b", "c"]]);
  });

  it("builds a concrete meetup note", () => {
    expect(meetupNote("Kresge north door", "7:00 PM")).toBe(
      "Kresge north door, 15 minutes before 7:00 PM",
    );
  });
});
