import {
  buddyRequestId,
  dinnerId,
  freeTonightId,
  makeJoinCode,
  memberDocId,
  newId,
  sessionKey,
  studyRequestId,
} from "@/core/ids";
import {
  chunkMatches,
  clusterByOverlap,
  hasActiveOptIn,
  meetupNote,
  visibleMutualSignals,
} from "@/core/matching";
import { endOfLocalDayISO } from "@/core/time";
import type {
  CampusEvent,
  Circle,
  CircleMember,
  CommonRoomBooking,
  DinnerStatus,
  EventBuddyMatch,
  EventBuddyRequest,
  FreeTonightSignal,
  GroceryItem,
  LocalProfile,
  StudyGroup,
  StudyRequest,
  User,
} from "@/core/types";
import { buildDemoWorld } from "./demo";
import type { CirclesStore, Unsubscribe } from "./store";

const DB_KEY = "circles.v1.db";
const SESSION_KEY = "circles.v1.uid";

type DB = {
  users: Record<string, User>;
  circles: Record<string, Circle>;
  members: Record<string, CircleMember>;
  joinCodes: Record<string, string>;
  dinner: Record<string, DinnerStatus>;
  groceries: Record<string, GroceryItem>;
  bookings: Record<string, CommonRoomBooking>;
  freeTonight: Record<string, FreeTonightSignal>;
  studyRequests: Record<string, StudyRequest>;
  studyGroups: Record<string, StudyGroup>;
  events: Record<string, CampusEvent>;
  buddyRequests: Record<string, EventBuddyRequest>;
  buddyMatches: Record<string, EventBuddyMatch>;
};

function emptyDb(): DB {
  return {
    users: {},
    circles: {},
    members: {},
    joinCodes: {},
    dinner: {},
    groceries: {},
    bookings: {},
    freeTonight: {},
    studyRequests: {},
    studyGroups: {},
    events: {},
    buddyRequests: {},
    buddyMatches: {},
  };
}

function loadDb(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return emptyDb();
    return { ...emptyDb(), ...(JSON.parse(raw) as DB) };
  } catch {
    return emptyDb();
  }
}

function saveDb(db: DB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function requireUser(db: DB, uid: string | null): User {
  if (!uid || !db.users[uid]) throw new Error("You're signed out.");
  return db.users[uid];
}

export function createMockStore(): CirclesStore {
  let db = loadDb();
  let currentUid = localStorage.getItem(SESSION_KEY);
  const listeners = new Set<() => void>();

  const notify = () => {
    saveDb(db);
    for (const listener of [...listeners]) listener();
  };

  const listen = (fn: () => void): Unsubscribe => {
    listeners.add(fn);
    fn();
    return () => {
      listeners.delete(fn);
    };
  };

  const current = () => requireUser(db, currentUid);

  const seedPublicEventsIfNeeded = () => {
    if (Object.keys(db.events).length > 0) return;
    const now = new Date().toISOString();
    const placeholders: CampusEvent[] = [
      {
        id: "evt-open-mic",
        name: "Open mic at the student center",
        date: endOfWeekday(5),
        startTime: "20:00",
        location: "Student center steps",
        description: "Casual sets. Opt in if you want someone to sit with.",
        createdBy: "demo-board",
        createdAt: now,
      },
    ];
    for (const event of placeholders) db.events[event.id] = event;
  };

  seedPublicEventsIfNeeded();

  const store: CirclesStore = {
    mode: "local",

    subscribeAuth: (cb) =>
      listen(() => {
        cb(currentUid && db.users[currentUid] ? db.users[currentUid] : null);
      }),

    signInLocal: async (name) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Add a name so people know who matched with them.");
      const existing = Object.values(db.users).find(
        (user) => user.name.toLowerCase() === trimmed.toLowerCase(),
      );
      const user =
        existing ??
        ({
          uid: newId("u"),
          name: trimmed,
          schoolEmail: null,
          photoUrl: null,
          createdAt: new Date().toISOString(),
        } satisfies User);
      db.users[user.uid] = user;
      currentUid = user.uid;
      localStorage.setItem(SESSION_KEY, user.uid);
      notify();
      return user;
    },

    switchLocalUser: async (uid) => {
      if (!db.users[uid]) throw new Error("That person isn't on this device.");
      currentUid = uid;
      localStorage.setItem(SESSION_KEY, uid);
      notify();
      return db.users[uid];
    },

    listLocalProfiles: () =>
      Object.values(db.users).map((user) => ({ uid: user.uid, name: user.name })),

    signInEmail: async () => {
      throw new Error("Email sign-in needs Firebase credentials.");
    },
    signUpEmail: async () => {
      throw new Error("Email sign-in needs Firebase credentials.");
    },

    signOut: async () => {
      currentUid = null;
      localStorage.removeItem(SESSION_KEY);
      notify();
    },

    updateProfile: async (patch) => {
      const user = current();
      db.users[user.uid] = {
        ...user,
        name: patch.name?.trim() || user.name,
        schoolEmail: patch.schoolEmail ?? user.schoolEmail,
      };
      notify();
    },

    subscribeCircles: (userId, cb) =>
      listen(() => {
        cb(
          Object.values(db.circles)
            .filter((circle) => circle.memberIds.includes(userId))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      }),

    createCircle: async (input) => {
      const user = current();
      const id = newId("c");
      const joinCode = uniqueJoinCode();
      const circle: Circle = {
        id,
        name: input.name.trim(),
        type: input.type,
        joinCode,
        memberIds: [user.uid],
        modulesEnabled: input.modulesEnabled,
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        logisticsCutoffHour: input.logisticsCutoffHour ?? 18,
      };
      if (!circle.name) throw new Error("Give the circle a name.");
      db.circles[id] = circle;
      db.joinCodes[joinCode] = id;
      db.members[memberDocId(id, user.uid)] = {
        id: memberDocId(id, user.uid),
        circleId: id,
        userId: user.uid,
        role: "admin",
        joinedAt: new Date().toISOString(),
      };
      notify();
      return circle;
    },

    joinCircle: async (joinCode) => {
      const user = current();
      const code = joinCode.trim().toUpperCase();
      const circleId = db.joinCodes[code];
      const circle = circleId ? db.circles[circleId] : undefined;
      if (!circle) throw new Error("No circle uses that join code.");
      if (!circle.memberIds.includes(user.uid)) {
        circle.memberIds = [...circle.memberIds, user.uid];
        db.members[memberDocId(circle.id, user.uid)] = {
          id: memberDocId(circle.id, user.uid),
          circleId: circle.id,
          userId: user.uid,
          role: "member",
          joinedAt: new Date().toISOString(),
        };
      }
      notify();
      return circle;
    },

    leaveCircle: async (circleId) => {
      const user = current();
      const circle = db.circles[circleId];
      if (!circle) return;
      circle.memberIds = circle.memberIds.filter((id) => id !== user.uid);
      delete db.members[memberDocId(circleId, user.uid)];
      notify();
    },

    subscribeMembers: (circleId, cb) =>
      listen(() => {
        cb(
          Object.values(db.members).filter((row) => row.circleId === circleId),
        );
      }),

    getUsers: async (uids) => uids.map((uid) => db.users[uid]).filter(Boolean),

    subscribeUserMap: (uids, cb) =>
      listen(() => {
        const map: Record<string, User> = {};
        for (const uid of uids) {
          if (db.users[uid]) map[uid] = db.users[uid];
        }
        cb(map);
      }),

    seedDemo: async () => {
      const user = current();
      const world = buildDemoWorld(user);
      for (const demoUser of world.users) db.users[demoUser.uid] = demoUser;
      for (const circle of world.circles) {
        const existing = db.circles[circle.id];
        db.circles[circle.id] = existing
          ? {
              ...circle,
              memberIds: Array.from(new Set([...circle.memberIds, ...existing.memberIds])),
            }
          : circle;
        db.joinCodes[circle.joinCode] = circle.id;
      }
      for (const member of world.members) db.members[member.id] = member;
      for (const row of world.dinner) db.dinner[row.id] = row;
      for (const row of world.groceries) db.groceries[row.id] = row;
      for (const row of world.bookings) db.bookings[row.id] = row;
      for (const row of world.freeTonight) db.freeTonight[row.id] = row;
      for (const row of world.studyRequests) db.studyRequests[row.id] = row;
      for (const row of world.events) db.events[row.id] = row;
      for (const row of world.buddyRequests) db.buddyRequests[row.id] = row;
      notify();
    },

    subscribeDinner: (circleId, date, cb) =>
      listen(() => {
        cb(
          Object.values(db.dinner).filter(
            (row) => row.circleId === circleId && row.date === date,
          ),
        );
      }),

    setDinnerStatus: async (circleId, date, status, notes = "") => {
      const user = current();
      assertMember(circleId, user.uid);
      const id = dinnerId(circleId, date, user.uid);
      db.dinner[id] = {
        id,
        circleId,
        date,
        userId: user.uid,
        status,
        notes,
        updatedAt: new Date().toISOString(),
      };
      notify();
    },

    subscribeGroceries: (circleId, cb) =>
      listen(() => {
        cb(
          Object.values(db.groceries)
            .filter((row) => row.circleId === circleId)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        );
      }),

    addGrocery: async (circleId, itemName) => {
      const user = current();
      assertMember(circleId, user.uid);
      const name = itemName.trim();
      if (!name) throw new Error("Name the item.");
      const id = newId("g");
      db.groceries[id] = {
        id,
        circleId,
        itemName: name,
        claimedBy: null,
        purchased: false,
        addedBy: user.uid,
        createdAt: new Date().toISOString(),
      };
      notify();
    },

    claimGrocery: async (itemId, claim) => {
      const user = current();
      const item = db.groceries[itemId];
      if (!item) return;
      assertMember(item.circleId, user.uid);
      if (claim && item.claimedBy && item.claimedBy !== user.uid) {
        throw new Error("Someone else already claimed that.");
      }
      item.claimedBy = claim ? user.uid : null;
      notify();
    },

    togglePurchased: async (itemId) => {
      const user = current();
      const item = db.groceries[itemId];
      if (!item) return;
      assertMember(item.circleId, user.uid);
      item.purchased = !item.purchased;
      notify();
    },

    removeGrocery: async (itemId) => {
      const user = current();
      const item = db.groceries[itemId];
      if (!item) return;
      assertMember(item.circleId, user.uid);
      delete db.groceries[itemId];
      notify();
    },

    subscribeBookings: (circleId, cb) =>
      listen(() => {
        cb(
          Object.values(db.bookings)
            .filter((row) => row.circleId === circleId)
            .sort((a, b) =>
              `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
            ),
        );
      }),

    addBooking: async (input) => {
      const user = current();
      assertMember(input.circleId, user.uid);
      if (input.endTime <= input.startTime) {
        throw new Error("End time needs to be after the start.");
      }
      const id = newId("b");
      db.bookings[id] = {
        id,
        circleId: input.circleId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        bookedBy: user.uid,
        note: input.note.trim(),
        createdAt: new Date().toISOString(),
      };
      notify();
    },

    removeBooking: async (bookingId) => {
      const user = current();
      const booking = db.bookings[bookingId];
      if (!booking) return;
      assertMember(booking.circleId, user.uid);
      if (booking.bookedBy !== user.uid) {
        throw new Error("Only the person who booked it can drop it.");
      }
      delete db.bookings[bookingId];
      notify();
    },

    subscribeFreeTonight: (circleId, date, cb) =>
      listen(() => {
        const user = currentUid ? db.users[currentUid] : null;
        if (!user) {
          cb({ mine: null, others: [] });
          return;
        }
        const all = Object.values(db.freeTonight).filter(
          (row) => row.circleId === circleId && row.date === date,
        );
        const mine = all.find((row) => row.userId === user.uid) ?? null;
        cb({
          mine,
          others: visibleMutualSignals(user.uid, mine, all),
        });
      }),

    setFreeTonight: async (circleId, date, on) => {
      const user = current();
      assertMember(circleId, user.uid);
      const id = freeTonightId(user.uid, circleId, date);
      if (on) {
        db.freeTonight[id] = {
          id,
          circleId,
          userId: user.uid,
          date,
          expiresAt: endOfLocalDayISO(date),
          createdAt: new Date().toISOString(),
        };
      } else {
        delete db.freeTonight[id];
      }
      notify();
    },

    subscribeStudy: (circleId, cb) =>
      listen(() => {
        const user = currentUid ? db.users[currentUid] : null;
        if (!user) {
          cb({ mine: [], groups: [] });
          return;
        }
        const mine = Object.values(db.studyRequests).filter(
          (row) => row.circleId === circleId && row.userId === user.uid,
        );
        const groups = Object.values(db.studyGroups).filter(
          (group) =>
            group.courseCircleId === circleId &&
            group.memberIds.includes(user.uid),
        );
        cb({ mine, groups });
      }),

    submitStudyRequest: async (input) => {
      const user = current();
      assertMember(input.circleId, user.uid);
      const label = input.targetSession.trim();
      if (!label) throw new Error("Say what you want to study for.");
      if (input.availableWindows.length === 0) {
        throw new Error("Add at least one time window.");
      }
      const key = sessionKey(label);
      const id = studyRequestId(user.uid, input.circleId, key);
      const request: StudyRequest = {
        id,
        circleId: input.circleId,
        userId: user.uid,
        targetSession: label,
        sessionKey: key,
        availableWindows: input.availableWindows,
        status: "open",
        createdAt: new Date().toISOString(),
      };
      db.studyRequests[id] = request;

      const open = Object.values(db.studyRequests).filter(
        (row) =>
          row.circleId === input.circleId &&
          row.sessionKey === key &&
          row.status === "open",
      );
      const alreadyGrouped = new Set(
        Object.values(db.studyGroups)
          .filter(
            (group) =>
              group.courseCircleId === input.circleId &&
              group.sessionKey === key,
          )
          .flatMap((group) => group.memberIds),
      );
      const unmatched = open.filter((row) => !alreadyGrouped.has(row.userId));
      const clusters = clusterByOverlap(unmatched);
      let created: StudyGroup | null = null;
      for (const cluster of clusters) {
        if (!cluster.members.some((member) => member.userId === user.uid)) {
          continue;
        }
        const group: StudyGroup = {
          id: newId("sg"),
          courseCircleId: input.circleId,
          memberIds: cluster.members.map((member) => member.userId),
          sessionLabel: label,
          sessionKey: key,
          windows: cluster.windows,
          matchedAt: new Date().toISOString(),
        };
        db.studyGroups[group.id] = group;
        for (const member of cluster.members) {
          const doc = db.studyRequests[member.id];
          if (doc) doc.status = "matched";
        }
        created = group;
      }
      notify();
      return created;
    },

    subscribeEvents: (cb) =>
      listen(() => {
        cb(
          Object.values(db.events).sort((a, b) =>
            `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
          ),
        );
      }),

    createEvent: async (input) => {
      const user = current();
      const name = input.name.trim();
      if (!name) throw new Error("Name the event.");
      const event: CampusEvent = {
        id: newId("evt"),
        name,
        date: input.date,
        startTime: input.startTime,
        location: input.location.trim(),
        description: input.description.trim(),
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      };
      db.events[event.id] = event;
      notify();
      return event;
    },

    subscribeBuddy: (eventId, cb) =>
      listen(() => {
        const user = currentUid ? db.users[currentUid] : null;
        if (!user) {
          cb({ mine: null, others: [], match: null });
          return;
        }
        const all = Object.values(db.buddyRequests).filter(
          (row) => row.eventId === eventId,
        );
        const mine = all.find((row) => row.userId === user.uid) ?? null;
        const match =
          Object.values(db.buddyMatches).find(
            (row) => row.eventId === eventId && row.userIds.includes(user.uid),
          ) ?? null;
        cb({
          mine,
          others: visibleMutualSignals(user.uid, mine, all),
          match,
        });
      }),

    setBuddyOptIn: async (event, on) => {
      const user = current();
      const id = buddyRequestId(user.uid, event.id);
      if (!on) {
        delete db.buddyRequests[id];
        notify();
        return null;
      }
      db.buddyRequests[id] = {
        id,
        eventId: event.id,
        eventName: event.name,
        userId: user.uid,
        status: "open",
        expiresAt: endOfLocalDayISO(event.date),
        createdAt: new Date().toISOString(),
      };

      const existing =
        Object.values(db.buddyMatches).find(
          (row) => row.eventId === event.id && row.userIds.includes(user.uid),
        ) ?? null;
      if (existing) {
        notify();
        return existing;
      }

      const unmatched = Object.values(db.buddyRequests).filter((row) => {
        if (row.eventId !== event.id || row.status !== "open") return false;
        if (!hasActiveOptIn(row)) return false;
        const already = Object.values(db.buddyMatches).some(
          (match) =>
            match.eventId === event.id && match.userIds.includes(row.userId),
        );
        return !already;
      });

      const groups = chunkMatches(unmatched);
      let created: EventBuddyMatch | null = null;
      for (const group of groups) {
        if (!group.some((row) => row.userId === user.uid)) continue;
        const match: EventBuddyMatch = {
          id: newId("bm"),
          eventId: event.id,
          userIds: group.map((row) => row.userId),
          meetupNote: meetupNote(event.location, formatClock(event.startTime)),
          createdAt: new Date().toISOString(),
        };
        db.buddyMatches[match.id] = match;
        for (const row of group) {
          const doc = db.buddyRequests[row.id];
          if (doc) doc.status = "matched";
        }
        created = match;
      }
      notify();
      return created;
    },
  };

  function assertMember(circleId: string, uid: string) {
    const circle = db.circles[circleId];
    if (!circle || !circle.memberIds.includes(uid)) {
      throw new Error("You're not in that circle.");
    }
  }

  function uniqueJoinCode() {
    for (let i = 0; i < 8; i += 1) {
      const code = makeJoinCode();
      if (!db.joinCodes[code]) return code;
    }
    return makeJoinCode() + makeJoinCode().slice(0, 2);
  }

  return store;
}

function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function endOfWeekday(weekday: number) {
  const now = new Date();
  const delta = (weekday - now.getDay() + 7) % 7 || 7;
  const target = new Date(now);
  target.setDate(now.getDate() + delta);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type { LocalProfile };
