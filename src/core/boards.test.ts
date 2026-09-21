import { describe, expect, it } from "vitest";
import {
  activeCheckIns,
  claimsByPset,
  expiryFromOption,
  groupCheckInsByPlace,
  sortNoticesNewest,
  upcomingMeetings,
} from "./boards";
import type { CircleMeeting, CircleNotice, PresenceCheckIn, PsetClaim } from "./types";

const now = new Date("2026-09-20T18:00:00.000Z");

function checkIn(
  patch: Partial<PresenceCheckIn> & Pick<PresenceCheckIn, "id" | "userId" | "placeLabel">,
): PresenceCheckIn {
  return {
    circleId: "c1",
    placeKind: "library",
    expiresAt: new Date(now.getTime() + 60_000).toISOString(),
    createdAt: now.toISOString(),
    ...patch,
  };
}

describe("presence check-ins", () => {
  it("treats until-cleared as active and drops expired rows at view time", () => {
    const rows = [
      checkIn({ id: "a", userId: "maya", expiresAt: null, placeLabel: "Library" }),
      checkIn({
        id: "b",
        userId: "jonah",
        expiresAt: new Date(now.getTime() - 60_000).toISOString(),
        placeLabel: "Library",
      }),
    ];
    expect(activeCheckIns(rows, now).map((row) => row.userId)).toEqual(["maya"]);
  });

  it("groups people by named place, not coordinates", () => {
    const groups = groupCheckInsByPlace([
      checkIn({ id: "a", userId: "maya", placeLabel: "Library", placeKind: "library" }),
      checkIn({ id: "b", userId: "jonah", placeLabel: "library", placeKind: "library" }),
      checkIn({
        id: "c",
        userId: "priya",
        placeKind: "custom",
        placeLabel: "Hayden stacks",
      }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].people.map((row) => row.userId).sort()).toEqual(["jonah", "maya"]);
    expect(groups[1].placeLabel).toBe("Hayden stacks");
  });

  it("maps 2h / 4h / until-cleared expiry options", () => {
    expect(expiryFromOption("until_cleared", now)).toBeNull();
    expect(expiryFromOption("2h", now)).toBe("2026-09-20T20:00:00.000Z");
    expect(expiryFromOption("4h", now)).toBe("2026-09-20T22:00:00.000Z");
  });
});

describe("pset claims", () => {
  it("lists who is on each problem set", () => {
    const claims: PsetClaim[] = [
      { id: "1", psetId: "p3", circleId: "c", userId: "maya", createdAt: now.toISOString() },
      { id: "2", psetId: "p3", circleId: "c", userId: "jonah", createdAt: now.toISOString() },
      { id: "3", psetId: "p4", circleId: "c", userId: "priya", createdAt: now.toISOString() },
    ];
    const map = claimsByPset(claims);
    expect(map.get("p3")?.map((row) => row.userId).sort()).toEqual(["jonah", "maya"]);
    expect(map.get("p4")?.map((row) => row.userId)).toEqual(["priya"]);
  });
});

describe("meetings", () => {
  it("keeps upcoming items and ignores past ones", () => {
    const meetings: CircleMeeting[] = [
      {
        id: "past",
        circleId: "c",
        name: "Old rehearsal",
        date: "2026-09-19",
        startTime: "18:00",
        place: "",
        note: "",
        addedBy: "maya",
        createdAt: now.toISOString(),
      },
      {
        id: "soon",
        circleId: "c",
        name: "Office hours",
        date: "2026-09-21",
        startTime: "14:00",
        place: "26-100",
        note: "",
        addedBy: "jonah",
        createdAt: now.toISOString(),
      },
    ];
    expect(upcomingMeetings(meetings, "2026-09-20").map((row) => row.id)).toEqual(["soon"]);
  });
});

describe("notices", () => {
  it("sorts newest first", () => {
    const notices: CircleNotice[] = [
      {
        id: "old",
        circleId: "c",
        body: "Mice last week",
        where: "kitchen",
        tag: "pest",
        postedBy: "maya",
        createdAt: "2026-09-18T12:00:00.000Z",
      },
      {
        id: "new",
        circleId: "c",
        body: "Bathroom is really dirty",
        where: "3rd floor bathroom",
        tag: "dirty",
        postedBy: "priya",
        createdAt: "2026-09-20T12:00:00.000Z",
      },
    ];
    expect(sortNoticesNewest(notices).map((row) => row.id)).toEqual(["new", "old"]);
  });
});
