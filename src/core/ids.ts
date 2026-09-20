export function freeTonightId(userId: string, circleId: string, date: string) {
  return `${userId}_${circleId}_${date}`;
}

export function studyRequestId(
  userId: string,
  circleId: string,
  sessionKey: string,
) {
  return `${userId}_${circleId}_${sessionKey}`;
}

export function buddyRequestId(userId: string, eventId: string) {
  return `${userId}_${eventId}`;
}

export function memberDocId(circleId: string, userId: string) {
  return `${circleId}_${userId}`;
}

export function dinnerId(circleId: string, date: string, userId: string) {
  return `${circleId}_${date}_${userId}`;
}

export function sessionKey(label: string) {
  const key = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return key || "session";
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeJoinCode(length = 6) {
  let code = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
}

export function newId(prefix = "") {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return prefix ? `${prefix}_${id}` : id;
}
