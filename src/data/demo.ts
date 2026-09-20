import { dinnerId, freeTonightId, memberDocId, studyRequestId } from "@/core/ids";
import { endOfLocalDayISO, localDateISO } from "@/core/time";
import type {
  CampusEvent,
  Circle,
  CircleMember,
  CommonRoomBooking,
  DinnerStatus,
  EventBuddyRequest,
  FreeTonightSignal,
  GroceryItem,
  StudyRequest,
  User,
} from "@/core/types";

export const DEMO_HOUSE_ID = "demo-oak-street";
export const DEMO_COURSE_ID = "demo-6006";

export function demoUsers(you: User): User[] {
  const now = new Date().toISOString();
  return [
    {
      uid: "demo-maya",
      name: "Maya Chen",
      schoolEmail: "maya@mit.edu",
      photoUrl: null,
      createdAt: now,
    },
    {
      uid: "demo-jonah",
      name: "Jonah Park",
      schoolEmail: "jonah@mit.edu",
      photoUrl: null,
      createdAt: now,
    },
    {
      uid: "demo-priya",
      name: "Priya Shah",
      schoolEmail: "priya@mit.edu",
      photoUrl: null,
      createdAt: now,
    },
    you,
  ];
}

export function buildDemoWorld(you: User) {
  const today = localDateISO();
  const users = demoUsers(you);
  const maya = users[0];
  const jonah = users[1];
  const priya = users[2];
  const memberIds = [you.uid, maya.uid, jonah.uid, priya.uid];
  const now = new Date().toISOString();

  const house: Circle = {
    id: DEMO_HOUSE_ID,
    name: "Oak Street house",
    type: "household",
    joinCode: "OAK4US",
    memberIds,
    modulesEnabled: ["logistics"],
    createdBy: maya.uid,
    createdAt: now,
    logisticsCutoffHour: 18,
  };

  const course: Circle = {
    id: DEMO_COURSE_ID,
    name: "6.006 recitation",
    type: "campus_group",
    joinCode: "ALG006",
    memberIds,
    modulesEnabled: ["free_tonight", "study_groups"],
    createdBy: jonah.uid,
    createdAt: now,
    logisticsCutoffHour: 18,
  };

  const members: CircleMember[] = [house, course].flatMap((circle) =>
    memberIds.map((userId) => ({
      id: memberDocId(circle.id, userId),
      circleId: circle.id,
      userId,
      role: userId === circle.createdBy ? "admin" : "member",
      joinedAt: now,
    })),
  );

  const dinner: DinnerStatus[] = [
    {
      id: dinnerId(house.id, today, maya.uid),
      circleId: house.id,
      date: today,
      userId: maya.uid,
      status: "cooking",
      notes: "Pasta puttanesca if anyone's in",
      updatedAt: now,
    },
    {
      id: dinnerId(house.id, today, jonah.uid),
      circleId: house.id,
      date: today,
      userId: jonah.uid,
      status: "eating_out",
      notes: "Lab runs late",
      updatedAt: now,
    },
    {
      id: dinnerId(house.id, today, priya.uid),
      circleId: house.id,
      date: today,
      userId: priya.uid,
      status: "ordering",
      notes: "",
      updatedAt: now,
    },
  ];

  const groceries: GroceryItem[] = [
    {
      id: "g-oat-milk",
      circleId: house.id,
      itemName: "Oat milk",
      claimedBy: maya.uid,
      purchased: false,
      addedBy: priya.uid,
      createdAt: now,
    },
    {
      id: "g-garlic",
      circleId: house.id,
      itemName: "Garlic",
      claimedBy: null,
      purchased: false,
      addedBy: maya.uid,
      createdAt: now,
    },
    {
      id: "g-paper",
      circleId: house.id,
      itemName: "Paper towels",
      claimedBy: jonah.uid,
      purchased: true,
      addedBy: jonah.uid,
      createdAt: now,
    },
  ];

  const bookings: CommonRoomBooking[] = [
    {
      id: "b-priya-review",
      circleId: house.id,
      date: today,
      startTime: "19:30",
      endTime: "21:00",
      bookedBy: priya.uid,
      note: "Quiz 2 whiteboard session",
      createdAt: now,
    },
  ];

  const freeTonight: FreeTonightSignal[] = [
    {
      id: freeTonightId(maya.uid, course.id, today),
      circleId: course.id,
      userId: maya.uid,
      date: today,
      expiresAt: endOfLocalDayISO(today),
      createdAt: now,
    },
    {
      id: freeTonightId(jonah.uid, course.id, today),
      circleId: course.id,
      userId: jonah.uid,
      date: today,
      expiresAt: endOfLocalDayISO(today),
      createdAt: now,
    },
  ];

  const studyRequests: StudyRequest[] = [
    {
      id: studyRequestId(maya.uid, course.id, "quiz-2-review"),
      circleId: course.id,
      userId: maya.uid,
      targetSession: "Quiz 2 review",
      sessionKey: "quiz-2-review",
      availableWindows: [{ start: "18:00", end: "21:00" }],
      status: "open",
      createdAt: now,
    },
    {
      id: studyRequestId(jonah.uid, course.id, "quiz-2-review"),
      circleId: course.id,
      userId: jonah.uid,
      targetSession: "Quiz 2 review",
      sessionKey: "quiz-2-review",
      availableWindows: [{ start: "19:00", end: "22:00" }],
      status: "open",
      createdAt: now,
    },
  ];

  const friday = upcomingWeekday(5);
  const sunday = upcomingWeekday(0);

  const events: CampusEvent[] = [
    {
      id: "evt-kresge",
      name: "Kresge concert",
      date: friday,
      startTime: "19:00",
      location: "Kresge north entrance",
      description: "Student chamber group. Easy to walk in alone — that's the point of a buddy.",
      createdBy: maya.uid,
      createdAt: now,
    },
    {
      id: "evt-market",
      name: "Sunday farmers market",
      date: sunday,
      startTime: "10:00",
      location: "Kendall plaza",
      description: "Produce run. Pair up if you don't want to wander the stalls solo.",
      createdBy: priya.uid,
      createdAt: now,
    },
    {
      id: "evt-screening",
      name: "Thursday film screening",
      date: upcomingWeekday(4),
      startTime: "20:00",
      location: "Building 6 lobby",
      description: "Department movie night. Meet in the lobby so nobody has to claim a row alone.",
      createdBy: jonah.uid,
      createdAt: now,
    },
  ];

  const buddyRequests: EventBuddyRequest[] = [
    {
      id: `${maya.uid}_evt-kresge`,
      eventId: "evt-kresge",
      eventName: "Kresge concert",
      userId: maya.uid,
      status: "open",
      expiresAt: endOfLocalDayISO(friday),
      createdAt: now,
    },
    {
      id: `${priya.uid}_evt-kresge`,
      eventId: "evt-kresge",
      eventName: "Kresge concert",
      userId: priya.uid,
      status: "open",
      expiresAt: endOfLocalDayISO(friday),
      createdAt: now,
    },
  ];

  return {
    users,
    circles: [house, course],
    members,
    dinner,
    groceries,
    bookings,
    freeTonight,
    studyRequests,
    events,
    buddyRequests,
  };
}

function upcomingWeekday(weekday: number) {
  const now = new Date();
  const delta = (weekday - now.getDay() + 7) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() + (delta === 0 ? 7 : delta));
  return localDateISO(target);
}
