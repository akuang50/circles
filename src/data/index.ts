import { isFirebaseConfigured } from "./config";
import { createFirebaseStore } from "./firebase";
import { createMockStore } from "./mock";
import type { CirclesStore } from "./store";

let singleton: CirclesStore | null = null;

export function getStore(): CirclesStore {
  if (!singleton) {
    singleton = isFirebaseConfigured() ? createFirebaseStore() : createMockStore();
  }
  return singleton;
}

export { isFirebaseConfigured };
export type { CirclesStore } from "./store";
