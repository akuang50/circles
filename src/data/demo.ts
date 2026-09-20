import { dinnerId, freeTonightId, memberDocId, presenceId, psetClaimId, studyRequestId } from "@/core/ids";
import { addDaysISO, endOfLocalDayISO, hoursFromNowISO, localDateISO } from "@/core/time";
import type {
  CampusEvent,
  Circle,
  CircleMeeting,
  CircleMember,
  CircleNotice,
  CommonRoomBooking,
  DinnerStatus,
  EventBuddyRequest,
  FreeTonightSignal,
  GroceryItem,
  PresenceCheckIn,
  Pset,
  PsetClaim,
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
    modulesEnabled: ["logistics", "presence", "meetings", "notices"],
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
    modulesEnabled: ["free_tonight", "study_groups", "presence", "psets", "meetings", "notices"],
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

  const presence: PresenceCheckIn[] = [
    {
      id: presenceId(priya.uid, house.id),
      circleId: house.id,
      userId: priya.uid,
      placeKind: "home",
      placeLabel: "Home",
      expiresAt: null,
      createdAt: now,
    },
    {
      id: presenceId(maya.uid, house.id),
      circleId: house.id,
      userId: maya.uid,
      placeKind: "dorm",
      placeLabel: "Dorm / common room",
      expiresAt: hoursFromNowISO(4),
      createdAt: now,
    },
    {
      id: presenceId(jonah.uid, course.id),
      circleId: course.id,
      userId: jonah.uid,
      placeKind: "library",
      placeLabel: "Library",
      expiresAt: hoursFromNowISO(2),
      createdAt: now,
    },
    {
      id: presenceId(maya.uid, course.id),
      circleId: course.id,
      userId: maya.uid,
      placeKind: "dining_hall",
      placeLabel: "Dining hall",
      expiresAt: hoursFromNowISO(2),
      createdAt: now,
    },
  ];

  const psets: Pset[] = [
    {
      id: "ps-demo-3",
      circleId: course.id,
      title: "Pset 3",
      dueDate: addDaysISO(today, 3),
      note: "Graph shortest paths. Office hours Thursday.",
      addedBy: jonah.uid,
      createdAt: now,
    },
    {
      id: "ps-demo-4",
      circleId: course.id,
      title: "Pset 4",
      dueDate: addDaysISO(today, 10),
      note: "",
      addedBy: maya.uid,
      createdAt: now,
    },
  ];

  const psetClaims: PsetClaim[] = [
    {
      id: psetClaimId(maya.uid, "ps-demo-3"),
      psetId: "ps-demo-3",
      circleId: course.id,
      userId: maya.uid,
      createdAt: now,
    },
    {
      id: psetClaimId(jonah.uid, "ps-demo-3"),
      psetId: "ps-demo-3",
      circleId: course.id,
      userId: jonah.uid,
      createdAt: now,
    },
  ];

  const meetings: CircleMeeting[] = [
    {
      id: "mt-house-kitchen",
      circleId: house.id,
      name: "Kitchen restock run",
      date: addDaysISO(today, 1),
      startTime: "18:30",
      place: "Oak Street kitchen",
      note: "Optional — only if you're around.",
      addedBy: priya.uid,
      createdAt: now,
    },
    {
      id: "mt-oh",
      circleId: course.id,
      name: "TA office hours",
      date: addDaysISO(today, 2),
      startTime: "16:00",
      place: "26-168",
      note: "Bring the graph questions from Pset 3.",
      addedBy: jonah.uid,
      createdAt: now,
    },
    {
      id: "mt-chamber",
      circleId: course.id,
      name: "Chamber ensemble rehearsal",
      date: friday,
      startTime: "17:30",
      place: "Kresge rehearsal room",
      note: "",
      addedBy: maya.uid,
      createdAt: now,
    },
  ];

  const notices: CircleNotice[] = [
    {
      id: "nt-bathroom",
      circleId: house.id,
      body: "The third-floor bathroom is really dirty — sink is full of hair and the floor is sticky.",
      where: "3rd floor bathroom",
      tag: "dirty",
      postedBy: priya.uid,
      createdAt: now,
    },
    {
      id: "nt-mice",
      circleId: house.id,
      body: "Mice sighting by the stove last night. Traps are in the cabinet if someone wants to set them.",
      where: "Kitchen",
      tag: "pest",
      postedBy: maya.uid,
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
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
    presence,
    psets,
    psetClaims,
    meetings,
    notices,
  };
}

function upcomingWeekday(weekday: number) {
  const now = new Date();
  const delta = (weekday - now.getDay() + 7) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() + (delta === 0 ? 7 : delta));
  return localDateISO(target);
}
