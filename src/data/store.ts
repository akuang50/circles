import type {
  CampusEvent,
  Circle,
  CircleMeeting,
  CircleMember,
  CircleNotice,
  CommonRoomBooking,
  DataMode,
  DinnerStatus,
  DinnerStatusValue,
  EventBuddyMatch,
  EventBuddyRequest,
  FreeTonightSignal,
  GroceryItem,
  LocalProfile,
  ModuleId,
  NoticeTag,
  PlaceKind,
  PresenceCheckIn,
  PresenceExpiryOption,
  Pset,
  PsetClaim,
  StudyGroup,
  StudyRequest,
  TimeWindow,
  User,
} from "@/core/types";

export type Unsubscribe = () => void;

export type CreateCircleInput = {
  name: string;
  type: Circle["type"];
  modulesEnabled: ModuleId[];
  logisticsCutoffHour?: number;
};

export type CreateEventInput = {
  name: string;
  date: string;
  startTime: string;
  location: string;
  description: string;
};

export type CirclesStore = {
  mode: DataMode;
  subscribeAuth: (cb: (user: User | null) => void) => Unsubscribe;
  signInLocal: (name: string) => Promise<User>;
  switchLocalUser: (uid: string) => Promise<User>;
  listLocalProfiles: () => LocalProfile[];
  signInEmail: (email: string, password: string) => Promise<User>;
  signUpEmail: (name: string, email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  updateProfile: (patch: { name?: string; schoolEmail?: string }) => Promise<void>;

  subscribeCircles: (
    userId: string,
    cb: (circles: Circle[]) => void,
  ) => Unsubscribe;
  createCircle: (input: CreateCircleInput) => Promise<Circle>;
  joinCircle: (joinCode: string) => Promise<Circle>;
  leaveCircle: (circleId: string) => Promise<void>;
  setCircleModules: (circleId: string, modulesEnabled: ModuleId[]) => Promise<void>;
  subscribeMembers: (
    circleId: string,
    cb: (members: CircleMember[]) => void,
  ) => Unsubscribe;
  getUsers: (uids: string[]) => Promise<User[]>;
  subscribeUserMap: (
    uids: string[],
    cb: (users: Record<string, User>) => void,
  ) => Unsubscribe;

  seedDemo: () => Promise<void>;

  subscribeDinner: (
    circleId: string,
    date: string,
    cb: (rows: DinnerStatus[]) => void,
  ) => Unsubscribe;
  setDinnerStatus: (
    circleId: string,
    date: string,
    status: DinnerStatusValue,
    notes?: string,
  ) => Promise<void>;

  subscribeGroceries: (
    circleId: string,
    cb: (items: GroceryItem[]) => void,
  ) => Unsubscribe;
  addGrocery: (circleId: string, itemName: string) => Promise<void>;
  claimGrocery: (itemId: string, claim: boolean) => Promise<void>;
  togglePurchased: (itemId: string) => Promise<void>;
  removeGrocery: (itemId: string) => Promise<void>;

  subscribeBookings: (
    circleId: string,
    cb: (rows: CommonRoomBooking[]) => void,
  ) => Unsubscribe;
  addBooking: (input: {
    circleId: string;
    date: string;
    startTime: string;
    endTime: string;
    note: string;
  }) => Promise<void>;
  removeBooking: (bookingId: string) => Promise<void>;

  subscribeFreeTonight: (
    circleId: string,
    date: string,
    cb: (payload: {
      mine: FreeTonightSignal | null;
      others: FreeTonightSignal[];
    }) => void,
  ) => Unsubscribe;
  setFreeTonight: (circleId: string, date: string, on: boolean) => Promise<void>;

  subscribeStudy: (
    circleId: string,
    cb: (payload: {
      mine: StudyRequest[];
      groups: StudyGroup[];
    }) => void,
  ) => Unsubscribe;
  submitStudyRequest: (input: {
    circleId: string;
    targetSession: string;
    availableWindows: TimeWindow[];
  }) => Promise<StudyGroup | null>;

  subscribeEvents: (cb: (events: CampusEvent[]) => void) => Unsubscribe;
  createEvent: (input: CreateEventInput) => Promise<CampusEvent>;
  subscribeBuddy: (
    eventId: string,
    cb: (payload: {
      mine: EventBuddyRequest | null;
      others: EventBuddyRequest[];
      match: EventBuddyMatch | null;
    }) => void,
  ) => Unsubscribe;
  setBuddyOptIn: (event: CampusEvent, on: boolean) => Promise<EventBuddyMatch | null>;

  subscribePresence: (
    circleId: string,
    cb: (rows: PresenceCheckIn[]) => void,
  ) => Unsubscribe;
  setPresenceCheckIn: (input: {
    circleId: string;
    placeKind: PlaceKind;
    placeLabel: string;
    expiry: PresenceExpiryOption;
  }) => Promise<void>;
  clearPresenceCheckIn: (circleId: string) => Promise<void>;

  subscribePsets: (
    circleId: string,
    cb: (payload: { psets: Pset[]; claims: PsetClaim[] }) => void,
  ) => Unsubscribe;
  addPset: (input: {
    circleId: string;
    title: string;
    dueDate: string;
    note: string;
  }) => Promise<Pset>;
  removePset: (psetId: string) => Promise<void>;
  setPsetClaim: (psetId: string, on: boolean) => Promise<void>;

  subscribeMeetings: (
    circleId: string,
    cb: (rows: CircleMeeting[]) => void,
  ) => Unsubscribe;
  addMeeting: (input: {
    circleId: string;
    name: string;
    date: string;
    startTime: string;
    place: string;
    note: string;
  }) => Promise<CircleMeeting>;
  removeMeeting: (meetingId: string) => Promise<void>;

  subscribeNotices: (
    circleId: string,
    cb: (rows: CircleNotice[]) => void,
  ) => Unsubscribe;
  addNotice: (input: {
    circleId: string;
    body: string;
    where: string;
    tag: NoticeTag;
  }) => Promise<CircleNotice>;
  removeNotice: (noticeId: string) => Promise<void>;
};
