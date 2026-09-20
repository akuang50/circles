export const CIRCLE_TYPES = ["household", "campus_group"] as const;
export type CircleType = (typeof CIRCLE_TYPES)[number];

export const MODULE_IDS = ["logistics", "free_tonight", "study_groups"] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export const MEMBER_ROLES = ["member", "admin"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const DINNER_STATUSES = ["cooking", "eating_out", "ordering"] as const;
export type DinnerStatusValue = (typeof DINNER_STATUSES)[number];

export const REQUEST_STATUSES = ["open", "matched"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type User = {
  uid: string;
  name: string;
  schoolEmail?: string | null;
  photoUrl?: string | null;
  createdAt: string;
};

export type Circle = {
  id: string;
  name: string;
  type: CircleType;
  joinCode: string;
  memberIds: string[];
  modulesEnabled: ModuleId[];
  createdBy: string;
  createdAt: string;
  logisticsCutoffHour: number;
};

export type CircleMember = {
  id: string;
  circleId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
};

export type DinnerStatus = {
  id: string;
  circleId: string;
  date: string;
  userId: string;
  status: DinnerStatusValue;
  notes: string;
  updatedAt: string;
};

export type GroceryItem = {
  id: string;
  circleId: string;
  itemName: string;
  claimedBy: string | null;
  purchased: boolean;
  addedBy: string;
  createdAt: string;
};

export type CommonRoomBooking = {
  id: string;
  circleId: string;
  date: string;
  startTime: string;
  endTime: string;
  bookedBy: string;
  note: string;
  createdAt: string;
};

export type FreeTonightSignal = {
  id: string;
  circleId: string;
  userId: string;
  date: string;
  expiresAt: string;
  createdAt: string;
};

export type TimeWindow = {
  start: string;
  end: string;
};

export type StudyRequest = {
  id: string;
  circleId: string;
  userId: string;
  targetSession: string;
  sessionKey: string;
  availableWindows: TimeWindow[];
  status: RequestStatus;
  createdAt: string;
};

export type StudyGroup = {
  id: string;
  courseCircleId: string;
  memberIds: string[];
  sessionLabel: string;
  sessionKey: string;
  windows: TimeWindow[];
  matchedAt: string;
};

export type CampusEvent = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  location: string;
  description: string;
  createdBy: string;
  createdAt: string;
};

export type EventBuddyRequest = {
  id: string;
  eventId: string;
  eventName: string;
  userId: string;
  status: RequestStatus;
  expiresAt: string;
  createdAt: string;
};

export type EventBuddyMatch = {
  id: string;
  eventId: string;
  userIds: string[];
  meetupNote: string;
  createdAt: string;
};

export type LocalProfile = {
  uid: string;
  name: string;
};

export type DataMode = "firebase" | "local";
