import { useEffect, useMemo, useState } from "react";
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
  StudyGroup,
  StudyRequest,
  User,
} from "@/core/types";
import type { CirclesStore } from "@/data";

export function useCircles(store: CirclesStore, userId: string | undefined) {
  const [circles, setCircles] = useState<Circle[] | null>(null);
  useEffect(() => {
    if (!userId) return;
    return store.subscribeCircles(userId, setCircles);
  }, [store, userId]);
  return circles;
}

export function useMembers(store: CirclesStore, circleId: string | undefined) {
  const [members, setMembers] = useState<CircleMember[] | null>(null);
  useEffect(() => {
    if (!circleId) return;
    return store.subscribeMembers(circleId, setMembers);
  }, [store, circleId]);
  return members;
}

export function useUserMap(store: CirclesStore, uids: string[]) {
  const key = uids.slice().sort().join(",");
  const [map, setMap] = useState<Record<string, User>>({});
  useEffect(() => {
    return store.subscribeUserMap(uids, setMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, key]);
  return map;
}

export function useDinner(
  store: CirclesStore,
  circleId: string | undefined,
  date: string,
) {
  const [rows, setRows] = useState<DinnerStatus[] | null>(null);
  useEffect(() => {
    if (!circleId) return;
    return store.subscribeDinner(circleId, date, setRows);
  }, [store, circleId, date]);
  return rows;
}

export function useGroceries(store: CirclesStore, circleId: string | undefined) {
  const [rows, setRows] = useState<GroceryItem[] | null>(null);
  useEffect(() => {
    if (!circleId) return;
    return store.subscribeGroceries(circleId, setRows);
  }, [store, circleId]);
  return rows;
}

export function useBookings(store: CirclesStore, circleId: string | undefined) {
  const [rows, setRows] = useState<CommonRoomBooking[] | null>(null);
  useEffect(() => {
    if (!circleId) return;
    return store.subscribeBookings(circleId, setRows);
  }, [store, circleId]);
  return rows;
}

export function useFreeTonight(
  store: CirclesStore,
  circleId: string | undefined,
  date: string,
) {
  const [payload, setPayload] = useState<{
    mine: FreeTonightSignal | null;
    others: FreeTonightSignal[];
  } | null>(null);
  useEffect(() => {
    if (!circleId) return;
    return store.subscribeFreeTonight(circleId, date, setPayload);
  }, [store, circleId, date]);
  return payload;
}

export function useStudy(store: CirclesStore, circleId: string | undefined) {
  const [payload, setPayload] = useState<{
    mine: StudyRequest[];
    groups: StudyGroup[];
  } | null>(null);
  useEffect(() => {
    if (!circleId) return;
    return store.subscribeStudy(circleId, setPayload);
  }, [store, circleId]);
  return payload;
}

export function useEvents(store: CirclesStore) {
  const [events, setEvents] = useState<CampusEvent[] | null>(null);
  useEffect(() => store.subscribeEvents(setEvents), [store]);
  return events;
}

export function useBuddy(store: CirclesStore, eventId: string | undefined) {
  const [payload, setPayload] = useState<{
    mine: EventBuddyRequest | null;
    others: EventBuddyRequest[];
    match: EventBuddyMatch | null;
  } | null>(null);
  useEffect(() => {
    if (!eventId) return;
    return store.subscribeBuddy(eventId, setPayload);
  }, [store, eventId]);
  return payload;
}

export function useCircle(
  store: CirclesStore,
  userId: string | undefined,
  circleId: string | undefined,
) {
  const circles = useCircles(store, userId);
  return useMemo(() => {
    if (!circles) return undefined;
    return circles.find((circle) => circle.id === circleId) ?? null;
  }, [circles, circleId]);
}
