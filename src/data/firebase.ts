import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  getFirestore,
} from "firebase/firestore";
import {
  buddyRequestId,
  dinnerId,
  freeTonightId,
  makeJoinCode,
  memberDocId,
  presenceId,
  psetClaimId,
  sessionKey,
  studyRequestId,
} from "@/core/ids";
import { expiryFromOption } from "@/core/boards";
import { chunkMatches, clusterByOverlap, hasActiveOptIn, meetupNote, visibleMutualSignals } from "@/core/matching";
import { endOfLocalDayISO } from "@/core/time";
import type {
  CampusEvent,
  Circle,
  CircleMeeting,
  CircleMember,
  CircleNotice,
  CommonRoomBooking,
  DinnerStatus,
  EventBuddyMatch,
  EventBuddyRequest,
  FreeTonightSignal,
  GroceryItem,
  ModuleId,
  NoticeTag,
  PlaceKind,
  PresenceCheckIn,
  Pset,
  PsetClaim,
  StudyGroup,
  StudyRequest,
  TimeWindow,
  User,
} from "@/core/types";
import { MODULE_IDS, NOTICE_TAGS, PLACE_PRESETS } from "@/core/types";
import { firebaseConfig } from "./config";
import type { CirclesStore, Unsubscribe } from "./store";

function iso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function stamp(isoValue: string) {
  return Timestamp.fromDate(new Date(isoValue));
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function userFrom(uid: string, data: Record<string, unknown>, fallbackName = "Member"): User {
  return {
    uid,
    name: String(data.name ?? fallbackName),
    schoolEmail: (data.schoolEmail as string | null) ?? null,
    photoUrl: (data.photoUrl as string | null) ?? null,
    createdAt: iso(data.createdAt),
  };
}

function circleFrom(id: string, data: Record<string, unknown>): Circle {
  return {
    id,
    name: String(data.name ?? "Circle"),
    type: data.type === "campus_group" ? "campus_group" : "household",
    joinCode: String(data.joinCode ?? ""),
    memberIds: asStringArray(data.memberIds),
    modulesEnabled: asStringArray(data.modulesEnabled).filter((id): id is ModuleId =>
      (MODULE_IDS as readonly string[]).includes(id),
    ),
    createdBy: String(data.createdBy ?? ""),
    createdAt: iso(data.createdAt),
    logisticsCutoffHour: Number(data.logisticsCutoffHour ?? 18),
  };
}

async function profileFromAuth(db: Firestore, fbUser: FirebaseUser): Promise<User> {
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return userFrom(fbUser.uid, snap.data() as Record<string, unknown>, fbUser.displayName ?? "Member");
  const user: User = {
    uid: fbUser.uid,
    name: fbUser.displayName || fbUser.email || "Member",
    schoolEmail: fbUser.email,
    photoUrl: fbUser.photoURL,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, { ...user, createdAt: stamp(user.createdAt) });
  return user;
}

export function createFirebaseStore(): CirclesStore {
  const app = initializeApp(firebaseConfig());
  const auth = getAuth(app);
  const db = getFirestore(app);
  void setPersistence(auth, browserLocalPersistence);
  let current: User | null = null;

  const requireUser = () => {
    if (!current) throw new Error("You're signed out.");
    return current;
  };

  const store: CirclesStore = {
    mode: "firebase",

    subscribeAuth: (cb) =>
      onAuthStateChanged(auth, async (fbUser) => {
        if (!fbUser) {
          current = null;
          cb(null);
          return;
        }
        current = await profileFromAuth(db, fbUser);
        cb(current);
      }),

    signInLocal: async () => {
      throw new Error("Local profiles are only available without Firebase.");
    },
    switchLocalUser: async () => {
      throw new Error("Local profiles are only available without Firebase.");
    },
    listLocalProfiles: () => [],

    signInEmail: async (email, password) => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      current = await profileFromAuth(db, cred.user);
      return current;
    },

    signUpEmail: async (name, email, password) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Add a name so people know who matched with them.");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: trimmed });
      const user: User = {
        uid: cred.user.uid,
        name: trimmed,
        schoolEmail: email,
        photoUrl: null,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", user.uid), {
        ...user,
        createdAt: stamp(user.createdAt),
      });
      current = user;
      return user;
    },

    signOut: async () => {
      await fbSignOut(auth);
      current = null;
    },

    updateProfile: async (patch) => {
      const user = requireUser();
      const next = {
        ...user,
        name: patch.name?.trim() || user.name,
        schoolEmail: patch.schoolEmail ?? user.schoolEmail,
      };
      await setDoc(
        doc(db, "users", user.uid),
        { ...next, createdAt: stamp(user.createdAt) },
        { merge: true },
      );
      current = next;
    },

    subscribeCircles: (userId, cb) => {
      const q = query(
        collection(db, "circles"),
        where("memberIds", "array-contains", userId),
      );
      return onSnapshot(q, (snap) => {
        cb(
          snap.docs
            .map((row) => circleFrom(row.id, row.data() as Record<string, unknown>))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      });
    },

    createCircle: async (input) => {
      const user = requireUser();
      const joinCode = makeJoinCode();
      const ref = doc(collection(db, "circles"));
      const circle: Circle = {
        id: ref.id,
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
      await setDoc(ref, {
        ...circle,
        createdAt: stamp(circle.createdAt),
      });
      await setDoc(doc(db, "join_codes", joinCode), { circleId: circle.id });
      await setDoc(doc(db, "circle_members", memberDocId(circle.id, user.uid)), {
        id: memberDocId(circle.id, user.uid),
        circleId: circle.id,
        userId: user.uid,
        role: "admin",
        joinedAt: stamp(circle.createdAt),
      });
      return circle;
    },

    joinCircle: async (joinCode) => {
      const user = requireUser();
      const code = joinCode.trim().toUpperCase();
      const codeSnap = await getDoc(doc(db, "join_codes", code));
      if (!codeSnap.exists()) throw new Error("No circle uses that join code.");
      const circleId = String(codeSnap.data().circleId);
      const circleRef = doc(db, "circles", circleId);
      await updateDoc(circleRef, { memberIds: arrayUnion(user.uid) });
      await setDoc(doc(db, "circle_members", memberDocId(circleId, user.uid)), {
        id: memberDocId(circleId, user.uid),
        circleId,
        userId: user.uid,
        role: "member",
        joinedAt: stamp(new Date().toISOString()),
      });
      const circleSnap = await getDoc(circleRef);
      if (!circleSnap.exists()) throw new Error("That circle is gone.");
      return circleFrom(circleId, circleSnap.data() as Record<string, unknown>);
    },

    leaveCircle: async (circleId) => {
      const user = requireUser();
      const circleRef = doc(db, "circles", circleId);
      await updateDoc(circleRef, { memberIds: arrayRemove(user.uid) });
      await deleteDoc(doc(db, "circle_members", memberDocId(circleId, user.uid)));
    },

    setCircleModules: async (circleId, modulesEnabled) => {
      await updateDoc(doc(db, "circles", circleId), { modulesEnabled });
    },

    subscribeMembers: (circleId, cb) => {
      const q = query(
        collection(db, "circle_members"),
        where("circleId", "==", circleId),
      );
      return onSnapshot(q, (snap) => {
        cb(
          snap.docs.map((row) => {
            const data = row.data() as Record<string, unknown>;
            return {
              id: row.id,
              circleId: String(data.circleId),
              userId: String(data.userId),
              role: data.role === "admin" ? "admin" : "member",
              joinedAt: iso(data.joinedAt),
            } satisfies CircleMember;
          }),
        );
      });
    },

    getUsers: async (uids) => {
      const unique = Array.from(new Set(uids));
      const users: User[] = [];
      for (const uid of unique) {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) users.push(userFrom(uid, snap.data() as Record<string, unknown>));
      }
      return users;
    },

    subscribeUserMap: (uids, cb) => {
      let cancelled = false;
      const unique = Array.from(new Set(uids));
      const unsubs = unique.map((uid) =>
        onSnapshot(doc(db, "users", uid), (snap) => {
          if (cancelled || !snap.exists()) return;
          void store.getUsers(unique).then((users) => {
            if (cancelled) return;
            cb(Object.fromEntries(users.map((user) => [user.uid, user])));
          });
        }),
      );
      if (unique.length === 0) cb({});
      return () => {
        cancelled = true;
        unsubs.forEach((unsub) => unsub());
      };
    },

    seedDemo: async () => {
      throw new Error("The Oak Street demo is only available in local mode.");
    },

    subscribeDinner: (circleId, date, cb) => {
      const q = query(
        collection(db, "logistics_status"),
        where("circleId", "==", circleId),
        where("date", "==", date),
      );
      return onSnapshot(q, (snap) => {
        cb(
          snap.docs.map((row) => {
            const data = row.data() as Record<string, unknown>;
            return {
              id: row.id,
              circleId: String(data.circleId),
              date: String(data.date),
              userId: String(data.userId),
              status:
                data.status === "eating_out" || data.status === "ordering"
                  ? data.status
                  : "cooking",
              notes: String(data.notes ?? ""),
              updatedAt: iso(data.updatedAt),
            } satisfies DinnerStatus;
          }),
        );
      });
    },

    setDinnerStatus: async (circleId, date, status, notes = "") => {
      const user = requireUser();
      const id = dinnerId(circleId, date, user.uid);
      await setDoc(doc(db, "logistics_status", id), {
        id,
        circleId,
        date,
        userId: user.uid,
        status,
        notes,
        updatedAt: stamp(new Date().toISOString()),
      });
    },

    subscribeGroceries: (circleId, cb) => {
      const q = query(
        collection(db, "grocery_items"),
        where("circleId", "==", circleId),
      );
      return onSnapshot(q, (snap) => {
        cb(
          snap.docs
            .map((row) => {
              const data = row.data() as Record<string, unknown>;
              return {
                id: row.id,
                circleId: String(data.circleId),
                itemName: String(data.itemName),
                claimedBy: (data.claimedBy as string | null) ?? null,
                purchased: Boolean(data.purchased),
                addedBy: String(data.addedBy),
                createdAt: iso(data.createdAt),
              } satisfies GroceryItem;
            })
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        );
      });
    },

    addGrocery: async (circleId, itemName) => {
      const user = requireUser();
      const name = itemName.trim();
      if (!name) throw new Error("Name the item.");
      await addDoc(collection(db, "grocery_items"), {
        circleId,
        itemName: name,
        claimedBy: null,
        purchased: false,
        addedBy: user.uid,
        createdAt: stamp(new Date().toISOString()),
      });
    },

    claimGrocery: async (itemId, claim) => {
      const user = requireUser();
      const ref = doc(db, "grocery_items", itemId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const claimedBy = snap.data().claimedBy as string | null;
      if (claim && claimedBy && claimedBy !== user.uid) {
        throw new Error("Someone else already claimed that.");
      }
      await updateDoc(ref, { claimedBy: claim ? user.uid : null });
    },

    togglePurchased: async (itemId) => {
      const ref = doc(db, "grocery_items", itemId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      await updateDoc(ref, { purchased: !snap.data().purchased });
    },

    removeGrocery: async (itemId) => {
      await deleteDoc(doc(db, "grocery_items", itemId));
    },

    subscribeBookings: (circleId, cb) => {
      const q = query(
        collection(db, "common_room_bookings"),
        where("circleId", "==", circleId),
      );
      return onSnapshot(q, (snap) => {
        cb(
          snap.docs
            .map((row) => {
              const data = row.data() as Record<string, unknown>;
              return {
                id: row.id,
                circleId: String(data.circleId),
                date: String(data.date),
                startTime: String(data.startTime),
                endTime: String(data.endTime),
                bookedBy: String(data.bookedBy),
                note: String(data.note ?? ""),
                createdAt: iso(data.createdAt),
              } satisfies CommonRoomBooking;
            })
            .sort((a, b) =>
              `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
            ),
        );
      });
    },

    addBooking: async (input) => {
      const user = requireUser();
      if (input.endTime <= input.startTime) {
        throw new Error("End time needs to be after the start.");
      }
      await addDoc(collection(db, "common_room_bookings"), {
        circleId: input.circleId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        bookedBy: user.uid,
        note: input.note.trim(),
        createdAt: stamp(new Date().toISOString()),
      });
    },

    removeBooking: async (bookingId) => {
      await deleteDoc(doc(db, "common_room_bookings", bookingId));
    },

    subscribeFreeTonight: (circleId, date, cb) => {
      const user = requireUser();
      const mineRef = doc(
        db,
        "free_tonight_signals",
        freeTonightId(user.uid, circleId, date),
      );
      let inner: Unsubscribe | null = null;
      const unsub = onSnapshot(mineRef, (mineSnap) => {
        inner?.();
        inner = null;
        const mine = mineSnap.exists()
          ? signalFrom(mineSnap.id, mineSnap.data() as Record<string, unknown>)
          : null;
        if (!hasActiveOptIn(mine)) {
          cb({ mine, others: [] });
          return;
        }
        const q = query(
          collection(db, "free_tonight_signals"),
          where("circleId", "==", circleId),
          where("date", "==", date),
        );
        inner = onSnapshot(
          q,
          (snap) => {
            const all = snap.docs.map((row) =>
              signalFrom(row.id, row.data() as Record<string, unknown>),
            );
            cb({ mine, others: visibleMutualSignals(user.uid, mine, all) });
          },
          () => cb({ mine, others: [] }),
        );
      });
      return () => {
        inner?.();
        unsub();
      };
    },

    setFreeTonight: async (circleId, date, on) => {
      const user = requireUser();
      const id = freeTonightId(user.uid, circleId, date);
      const ref = doc(db, "free_tonight_signals", id);
      if (!on) {
        await deleteDoc(ref);
        return;
      }
      const createdAt = new Date().toISOString();
      await setDoc(ref, {
        id,
        circleId,
        userId: user.uid,
        date,
        expiresAt: stamp(endOfLocalDayISO(date)),
        createdAt: stamp(createdAt),
      });
    },

    subscribeStudy: (circleId, cb) => {
      const user = requireUser();
      const mineQuery = query(
        collection(db, "study_requests"),
        where("circleId", "==", circleId),
        where("userId", "==", user.uid),
      );
      const groupsQuery = query(
        collection(db, "study_groups"),
        where("courseCircleId", "==", circleId),
        where("memberIds", "array-contains", user.uid),
      );
      let mine: StudyRequest[] = [];
      let groups: StudyGroup[] = [];
      const publish = () => cb({ mine, groups });

      const unsubMine = onSnapshot(mineQuery, (snap) => {
        mine = snap.docs.map((row) =>
          studyFrom(row.id, row.data() as Record<string, unknown>),
        );
        publish();
      });
      const unsubGroups = onSnapshot(groupsQuery, (snap) => {
        groups = snap.docs.map((row) =>
          groupFrom(row.id, row.data() as Record<string, unknown>),
        );
        publish();
      });
      return () => {
        unsubMine();
        unsubGroups();
      };
    },

    submitStudyRequest: async (input) => {
      const user = requireUser();
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
      await setDoc(doc(db, "study_requests", id), {
        ...request,
        createdAt: stamp(request.createdAt),
      });

      const q = query(
        collection(db, "study_requests"),
        where("circleId", "==", input.circleId),
        where("sessionKey", "==", key),
        where("status", "==", "open"),
      );
      const snap = await getDocs(q);
      const open = snap.docs.map((row) =>
        studyFrom(row.id, row.data() as Record<string, unknown>),
      );
      const clusters = clusterByOverlap(open);
      let created: StudyGroup | null = null;
      for (const cluster of clusters) {
        if (!cluster.members.some((member) => member.userId === user.uid)) continue;
        const groupRef = doc(collection(db, "study_groups"));
        const group: StudyGroup = {
          id: groupRef.id,
          courseCircleId: input.circleId,
          memberIds: cluster.members.map((member) => member.userId),
          sessionLabel: label,
          sessionKey: key,
          windows: cluster.windows,
          matchedAt: new Date().toISOString(),
        };
        await setDoc(groupRef, {
          ...group,
          matchedAt: stamp(group.matchedAt),
        });
        for (const member of cluster.members) {
          await updateDoc(doc(db, "study_requests", member.id), { status: "matched" });
        }
        created = group;
      }
      return created;
    },

    subscribeEvents: (cb) =>
      onSnapshot(collection(db, "events"), (snap) => {
        cb(
          snap.docs
            .map((row) => eventFrom(row.id, row.data() as Record<string, unknown>))
            .sort((a, b) =>
              `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
            ),
        );
      }),

    createEvent: async (input) => {
      const user = requireUser();
      const name = input.name.trim();
      if (!name) throw new Error("Name the event.");
      const ref = doc(collection(db, "events"));
      const event: CampusEvent = {
        id: ref.id,
        name,
        date: input.date,
        startTime: input.startTime,
        location: input.location.trim(),
        description: input.description.trim(),
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, { ...event, createdAt: stamp(event.createdAt) });
      return event;
    },

    subscribeBuddy: (eventId, cb) => {
      const user = requireUser();
      const mineRef = doc(db, "event_buddy_requests", buddyRequestId(user.uid, eventId));
      const matchQuery = query(
        collection(db, "event_buddy_matches"),
        where("eventId", "==", eventId),
        where("userIds", "array-contains", user.uid),
      );
      let mine: EventBuddyRequest | null = null;
      let match: EventBuddyMatch | null = null;
      let inner: Unsubscribe | null = null;

      const unsubMine = onSnapshot(mineRef, (snap) => {
        inner?.();
        inner = null;
        mine = snap.exists()
          ? buddyFrom(snap.id, snap.data() as Record<string, unknown>)
          : null;
        if (!hasActiveOptIn(mine)) {
          cb({ mine, others: [], match });
          return;
        }
        const q = query(
          collection(db, "event_buddy_requests"),
          where("eventId", "==", eventId),
        );
        inner = onSnapshot(
          q,
          (othersSnap) => {
            const all = othersSnap.docs.map((row) =>
              buddyFrom(row.id, row.data() as Record<string, unknown>),
            );
            cb({
              mine,
              others: visibleMutualSignals(user.uid, mine, all),
              match,
            });
          },
          () => cb({ mine, others: [], match }),
        );
      });

      const unsubMatch = onSnapshot(matchQuery, (snap) => {
        match = snap.docs[0]
          ? matchFrom(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>)
          : null;
        cb({ mine, others: hasActiveOptIn(mine) ? [] : [], match });
      });

      return () => {
        inner?.();
        unsubMine();
        unsubMatch();
      };
    },

    setBuddyOptIn: async (event, on) => {
      const user = requireUser();
      const id = buddyRequestId(user.uid, event.id);
      const ref = doc(db, "event_buddy_requests", id);
      if (!on) {
        await deleteDoc(ref);
        return null;
      }
      await setDoc(ref, {
        id,
        eventId: event.id,
        eventName: event.name,
        userId: user.uid,
        status: "open",
        expiresAt: stamp(endOfLocalDayISO(event.date)),
        createdAt: stamp(new Date().toISOString()),
      });

      const existing = await getDocs(
        query(
          collection(db, "event_buddy_matches"),
          where("eventId", "==", event.id),
          where("userIds", "array-contains", user.uid),
        ),
      );
      if (!existing.empty) {
        const row = existing.docs[0];
        return matchFrom(row.id, row.data() as Record<string, unknown>);
      }

      const openSnap = await getDocs(
        query(
          collection(db, "event_buddy_requests"),
          where("eventId", "==", event.id),
          where("status", "==", "open"),
        ),
      );
      const unmatched = openSnap.docs
        .map((row) => buddyFrom(row.id, row.data() as Record<string, unknown>))
        .filter((row) => hasActiveOptIn(row));
      const groups = chunkMatches(unmatched);
      let created: EventBuddyMatch | null = null;
      for (const group of groups) {
        if (!group.some((row) => row.userId === user.uid)) continue;
        const matchRef = doc(collection(db, "event_buddy_matches"));
        const match: EventBuddyMatch = {
          id: matchRef.id,
          eventId: event.id,
          userIds: group.map((row) => row.userId),
          meetupNote: meetupNote(event.location, clock(event.startTime)),
          createdAt: new Date().toISOString(),
        };
        await setDoc(matchRef, { ...match, createdAt: stamp(match.createdAt) });
        for (const row of group) {
          await updateDoc(doc(db, "event_buddy_requests", row.id), {
            status: "matched",
          });
        }
        created = match;
      }
      return created;
    },

    subscribePresence: (circleId, cb) => {
      const q = query(
        collection(db, "presence_checkins"),
        where("circleId", "==", circleId),
      );
      return onSnapshot(q, (snap) => {
        cb(snap.docs.map((row) => presenceFrom(row.id, row.data() as Record<string, unknown>)));
      });
    },

    setPresenceCheckIn: async (input) => {
      const user = requireUser();
      const label = input.placeLabel.trim();
      if (!label) throw new Error("Name the place you're checking into.");
      const id = presenceId(user.uid, input.circleId);
      const createdAt = new Date().toISOString();
      const expiresAt = expiryFromOption(input.expiry);
      await setDoc(doc(db, "presence_checkins", id), {
        id,
        circleId: input.circleId,
        userId: user.uid,
        placeKind: input.placeKind,
        placeLabel: label,
        expiresAt: expiresAt ? stamp(expiresAt) : null,
        createdAt: stamp(createdAt),
      });
    },

    clearPresenceCheckIn: async (circleId) => {
      const user = requireUser();
      await deleteDoc(doc(db, "presence_checkins", presenceId(user.uid, circleId)));
    },

    subscribePsets: (circleId, cb) => {
      const psetQuery = query(
        collection(db, "psets"),
        where("circleId", "==", circleId),
      );
      const claimQuery = query(
        collection(db, "pset_claims"),
        where("circleId", "==", circleId),
      );
      let psets: Pset[] = [];
      let claims: PsetClaim[] = [];
      const publish = () =>
        cb({
          psets: [...psets].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
          claims,
        });
      const unsubPsets = onSnapshot(psetQuery, (snap) => {
        psets = snap.docs.map((row) => psetFrom(row.id, row.data() as Record<string, unknown>));
        publish();
      });
      const unsubClaims = onSnapshot(claimQuery, (snap) => {
        claims = snap.docs.map((row) =>
          psetClaimFrom(row.id, row.data() as Record<string, unknown>),
        );
        publish();
      });
      return () => {
        unsubPsets();
        unsubClaims();
      };
    },

    addPset: async (input) => {
      const user = requireUser();
      const title = input.title.trim();
      if (!title) throw new Error("Give the pset a short name, like Pset 3.");
      if (!input.dueDate) throw new Error("Add a due date.");
      const ref = doc(collection(db, "psets"));
      const pset: Pset = {
        id: ref.id,
        circleId: input.circleId,
        title,
        dueDate: input.dueDate,
        note: input.note.trim(),
        addedBy: user.uid,
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, { ...pset, createdAt: stamp(pset.createdAt) });
      return pset;
    },

    removePset: async (psetId) => {
      const user = requireUser();
      const ref = doc(db, "psets", psetId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      if (String(snap.data().addedBy) !== user.uid) {
        throw new Error("Only the person who added it can remove it.");
      }
      const claims = await getDocs(
        query(collection(db, "pset_claims"), where("psetId", "==", psetId)),
      );
      await Promise.all(claims.docs.map((row) => deleteDoc(row.ref)));
      await deleteDoc(ref);
    },

    setPsetClaim: async (psetId, on) => {
      const user = requireUser();
      const psetSnap = await getDoc(doc(db, "psets", psetId));
      if (!psetSnap.exists()) throw new Error("That pset isn't on the board.");
      const id = psetClaimId(user.uid, psetId);
      const ref = doc(db, "pset_claims", id);
      if (!on) {
        await deleteDoc(ref);
        return;
      }
      await setDoc(ref, {
        id,
        psetId,
        circleId: String(psetSnap.data().circleId),
        userId: user.uid,
        createdAt: stamp(new Date().toISOString()),
      });
    },

    subscribeMeetings: (circleId, cb) => {
      const q = query(collection(db, "circle_meetings"), where("circleId", "==", circleId));
      return onSnapshot(q, (snap) => {
        cb(
          snap.docs
            .map((row) => meetingFrom(row.id, row.data() as Record<string, unknown>))
            .sort((a, b) =>
              `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
            ),
        );
      });
    },

    addMeeting: async (input) => {
      const user = requireUser();
      const name = input.name.trim();
      if (!name) throw new Error("Name the meeting or club.");
      if (!input.date) throw new Error("Add a day.");
      const ref = doc(collection(db, "circle_meetings"));
      const meeting: CircleMeeting = {
        id: ref.id,
        circleId: input.circleId,
        name,
        date: input.date,
        startTime: input.startTime,
        place: input.place.trim(),
        note: input.note.trim(),
        addedBy: user.uid,
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, { ...meeting, createdAt: stamp(meeting.createdAt) });
      return meeting;
    },

    removeMeeting: async (meetingId) => {
      const user = requireUser();
      const ref = doc(db, "circle_meetings", meetingId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      if (String(snap.data().addedBy) !== user.uid) {
        throw new Error("Only the person who listed it can take it down.");
      }
      await deleteDoc(ref);
    },

    subscribeNotices: (circleId, cb) => {
      const q = query(collection(db, "circle_notices"), where("circleId", "==", circleId));
      return onSnapshot(q, (snap) => {
        cb(
          snap.docs
            .map((row) => noticeFrom(row.id, row.data() as Record<string, unknown>))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      });
    },

    addNotice: async (input) => {
      const user = requireUser();
      const body = input.body.trim();
      if (!body) throw new Error("Say what you saw.");
      const ref = doc(collection(db, "circle_notices"));
      const notice: CircleNotice = {
        id: ref.id,
        circleId: input.circleId,
        body,
        where: input.where.trim(),
        tag: input.tag,
        postedBy: user.uid,
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, { ...notice, createdAt: stamp(notice.createdAt) });
      return notice;
    },

    removeNotice: async (noticeId) => {
      const user = requireUser();
      const ref = doc(db, "circle_notices", noticeId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      if (String(snap.data().postedBy) !== user.uid) {
        throw new Error("Only the person who posted it can take it down.");
      }
      await deleteDoc(ref);
    },
  };

  return store;
}

function signalFrom(id: string, data: Record<string, unknown>): FreeTonightSignal {
  return {
    id,
    circleId: String(data.circleId),
    userId: String(data.userId),
    date: String(data.date),
    expiresAt: iso(data.expiresAt),
    createdAt: iso(data.createdAt),
  };
}

function studyFrom(id: string, data: Record<string, unknown>): StudyRequest {
  return {
    id,
    circleId: String(data.circleId),
    userId: String(data.userId),
    targetSession: String(data.targetSession),
    sessionKey: String(data.sessionKey),
    availableWindows: Array.isArray(data.availableWindows)
      ? (data.availableWindows as TimeWindow[])
      : [],
    status: data.status === "matched" ? "matched" : "open",
    createdAt: iso(data.createdAt),
  };
}

function groupFrom(id: string, data: Record<string, unknown>): StudyGroup {
  return {
    id,
    courseCircleId: String(data.courseCircleId),
    memberIds: asStringArray(data.memberIds),
    sessionLabel: String(data.sessionLabel),
    sessionKey: String(data.sessionKey),
    windows: Array.isArray(data.windows) ? (data.windows as TimeWindow[]) : [],
    matchedAt: iso(data.matchedAt),
  };
}

function eventFrom(id: string, data: Record<string, unknown>): CampusEvent {
  return {
    id,
    name: String(data.name),
    date: String(data.date),
    startTime: String(data.startTime),
    location: String(data.location ?? ""),
    description: String(data.description ?? ""),
    createdBy: String(data.createdBy ?? ""),
    createdAt: iso(data.createdAt),
  };
}

function buddyFrom(id: string, data: Record<string, unknown>): EventBuddyRequest {
  return {
    id,
    eventId: String(data.eventId),
    eventName: String(data.eventName ?? ""),
    userId: String(data.userId),
    status: data.status === "matched" ? "matched" : "open",
    expiresAt: iso(data.expiresAt),
    createdAt: iso(data.createdAt),
  };
}

function matchFrom(id: string, data: Record<string, unknown>): EventBuddyMatch {
  return {
    id,
    eventId: String(data.eventId),
    userIds: asStringArray(data.userIds),
    meetupNote: String(data.meetupNote ?? ""),
    createdAt: iso(data.createdAt),
  };
}

function presenceFrom(id: string, data: Record<string, unknown>): PresenceCheckIn {
  const kind = String(data.placeKind);
  const placeKind: PlaceKind =
    kind === "custom" || (PLACE_PRESETS as readonly string[]).includes(kind)
      ? (kind as PlaceKind)
      : "custom";
  return {
    id,
    circleId: String(data.circleId),
    userId: String(data.userId),
    placeKind,
    placeLabel: String(data.placeLabel ?? ""),
    expiresAt: data.expiresAt == null ? null : iso(data.expiresAt),
    createdAt: iso(data.createdAt),
  };
}

function psetFrom(id: string, data: Record<string, unknown>): Pset {
  return {
    id,
    circleId: String(data.circleId),
    title: String(data.title ?? ""),
    dueDate: String(data.dueDate ?? ""),
    note: String(data.note ?? ""),
    addedBy: String(data.addedBy ?? ""),
    createdAt: iso(data.createdAt),
  };
}

function psetClaimFrom(id: string, data: Record<string, unknown>): PsetClaim {
  return {
    id,
    psetId: String(data.psetId),
    circleId: String(data.circleId),
    userId: String(data.userId),
    createdAt: iso(data.createdAt),
  };
}

function meetingFrom(id: string, data: Record<string, unknown>): CircleMeeting {
  return {
    id,
    circleId: String(data.circleId),
    name: String(data.name ?? ""),
    date: String(data.date ?? ""),
    startTime: String(data.startTime ?? ""),
    place: String(data.place ?? ""),
    note: String(data.note ?? ""),
    addedBy: String(data.addedBy ?? ""),
    createdAt: iso(data.createdAt),
  };
}

function noticeFrom(id: string, data: Record<string, unknown>): CircleNotice {
  const tag = String(data.tag);
  return {
    id,
    circleId: String(data.circleId),
    body: String(data.body ?? ""),
    where: String(data.where ?? ""),
    tag: (NOTICE_TAGS as readonly string[]).includes(tag) ? (tag as NoticeTag) : "other",
    postedBy: String(data.postedBy ?? ""),
    createdAt: iso(data.createdAt),
  };
}

function clock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
