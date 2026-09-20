export const MODULE_COPY = {
  logistics: {
    label: "Household logistics",
    blurb: "Dinner, groceries, and the common room — without a 40-message thread.",
  },
  free_tonight: {
    label: "Free tonight",
    blurb: "Tap in privately. You only see who else is free once you are too.",
  },
  study_groups: {
    label: "Study groups",
    blurb: "Ask for a session. Matches form when windows overlap — nobody sees a lone request.",
  },
  presence: {
    label: "Who's where",
    blurb: "Tap a named place. This circle sees it until it expires or you clear it — not GPS, not a live map.",
  },
  psets: {
    label: "Psets",
    blurb: "Add the problem set by hand, then mark which one you're on. Nobody scrapes Canvas.",
  },
  meetings: {
    label: "Meetings & clubs",
    blurb: "Optional. List a rehearsal, office hours, or club if you want — empty is normal.",
  },
  notices: {
    label: "Sightings",
    blurb: "Post what you saw in this circle — a dirty bathroom, a pest, something broken. Names are on, because these are small trusted groups.",
  },
} as const;

export const DINNER_COPY = {
  cooking: "Cooking",
  eating_out: "Eating out",
  ordering: "Ordering in",
} as const;

export const PLACE_COPY = {
  library: "Library",
  dining_hall: "Dining hall",
  dorm: "Dorm / common room",
  class_building: "Class building",
  home: "Home",
  out: "Out",
} as const;

export const PRESENCE_EXPIRY_COPY = {
  "2h": "2 hours",
  "4h": "4 hours",
  until_cleared: "Until I clear it",
} as const;

export const NOTICE_TAG_COPY = {
  dirty: "Dirty",
  pest: "Pest",
  broken: "Broken",
  other: "Other",
} as const;
