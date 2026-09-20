import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, ErrorState, LoadingState } from "@/components/Status";
import { PersonChip } from "@/components/PersonChip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DINNER_COPY } from "@/core/copy";
import type { DinnerStatusValue } from "@/core/types";
import { addDaysISO, formatDayLabel, formatTime, isPastCutoff, localDateISO } from "@/core/time";
import { useApp } from "@/context/AppContext";
import {
  useBookings,
  useCircle,
  useDinner,
  useGroceries,
  useMembers,
  useUserMap,
} from "@/hooks/useStoreData";

export function HouseholdScreen() {
  const { circleId = "" } = useParams();
  const { store, user } = useApp();
  const today = localDateISO();
  const circle = useCircle(store, user?.uid, circleId);
  const members = useMembers(store, circleId);
  const dinner = useDinner(store, circleId, today);
  const groceries = useGroceries(store, circleId);
  const bookings = useBookings(store, circleId);
  const users = useUserMap(
    store,
    Array.from(
      new Set([
        ...(members?.map((row) => row.userId) ?? []),
        ...(groceries?.map((row) => [row.addedBy, row.claimedBy ?? ""]) ?? []).flat(),
        ...(bookings?.map((row) => row.bookedBy) ?? []),
      ]),
    ).filter(Boolean),
  );

  if (!user) return null;
  if (circle === undefined || !members || !dinner || !groceries || !bookings) {
    return <LoadingState label="Loading the house board…" />;
  }
  if (!circle) {
    return <ErrorState title="Circle not found" body="This household isn't on your account." />;
  }
  if (!circle.modulesEnabled.includes("logistics")) {
    return (
      <ErrorState
        title="Logistics isn't on"
        body="This circle doesn't have the household module enabled."
      />
    );
  }

  const cooking = dinner.filter((row) => row.status === "cooking");
  const showCutoff =
    isPastCutoff(circle.logisticsCutoffHour) && cooking.length === 0;

  return (
    <div className="space-y-6">
      <Header name={circle.name} circleId={circle.id} />
      {showCutoff ? (
        <Alert>
          <AlertTitle>No one's cooking tonight yet</AlertTitle>
          <AlertDescription>
            It's past {formatHour(circle.logisticsCutoffHour)} and the dinner
            board is still empty of cooks. Tap a status if you're making food,
            ordering, or heading out.
          </AlertDescription>
        </Alert>
      ) : null}

      <DinnerBoard
        userId={user.uid}
        members={members}
        dinner={dinner}
        users={users}
        onSet={async (status, notes) => {
          try {
            await store.setDinnerStatus(circle.id, today, status, notes);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update dinner.");
          }
        }}
      />

      <GroceryList
        userId={user.uid}
        items={groceries}
        users={users}
        onAdd={(name) => store.addGrocery(circle.id, name)}
        onClaim={(id, claim) => store.claimGrocery(id, claim)}
        onBought={(id) => store.togglePurchased(id)}
        onRemove={(id) => store.removeGrocery(id)}
      />

      <CommonRoom
        userId={user.uid}
        bookings={bookings}
        users={users}
        onAdd={(input) => store.addBooking({ circleId: circle.id, ...input })}
        onRemove={(id) => store.removeBooking(id)}
      />
    </div>
  );
}

function Header({ name, circleId }: { name: string; circleId: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        <Link to={`/circles/${circleId}`} className="hover:underline">
          {name}
        </Link>
        <span className="px-1">/</span>
        Household
      </p>
      <h1 className="font-serif text-3xl tracking-tight">House board</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        One screen for tonight's food, the shared list, and who has the common
        room. Claim a grocery item so nobody buys oat milk twice.
      </p>
    </div>
  );
}

function DinnerBoard({
  userId,
  members,
  dinner,
  users,
  onSet,
}: {
  userId: string;
  members: NonNullable<ReturnType<typeof useMembers>>;
  dinner: NonNullable<ReturnType<typeof useDinner>>;
  users: Record<string, { name: string }>;
  onSet: (status: DinnerStatusValue, notes: string) => Promise<void>;
}) {
  const mine = dinner.find((row) => row.userId === userId);
  const [notes, setNotes] = useState(mine?.notes ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl font-normal">Dinner tonight</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DINNER_COPY) as DinnerStatusValue[]).map((status) => (
            <Button
              key={status}
              type="button"
              variant={mine?.status === status ? "default" : "outline"}
              onClick={() => onSet(status, notes)}
            >
              {DINNER_COPY[status]}
            </Button>
          ))}
        </div>
        <Textarea
          placeholder="Pasta if you're around — optional note"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => {
            if (mine) void onSet(mine.status, notes);
          }}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((member) => {
            const row = dinner.find((item) => item.userId === member.userId);
            return (
              <div key={member.id} className="rounded-xl border px-3 py-3">
                <PersonChip
                  name={users[member.userId]?.name ?? "Member"}
                  hint={
                    row
                      ? `${DINNER_COPY[row.status]}${row.notes ? ` · ${row.notes}` : ""}`
                      : "Hasn't set a status"
                  }
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function GroceryList({
  userId,
  items,
  users,
  onAdd,
  onClaim,
  onBought,
  onRemove,
}: {
  userId: string;
  items: NonNullable<ReturnType<typeof useGroceries>>;
  users: Record<string, { name: string }>;
  onAdd: (name: string) => Promise<void>;
  onClaim: (id: string, claim: boolean) => Promise<void>;
  onBought: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await onAdd(name);
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl font-normal">Groceries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
          <Input
            placeholder="Oat milk"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button type="submit">Add item</Button>
        </form>
        {items.length === 0 ? (
          <EmptyState
            title="The list is empty"
            body="Add what the house is out of. Tap Claim if you're the one walking to the store."
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={item.purchased}
                    onCheckedChange={() => onBought(item.id).catch((error) => toast.error(error.message))}
                    className="mt-1"
                  />
                  <span>
                    <span className={`block text-sm font-medium ${item.purchased ? "line-through text-muted-foreground" : ""}`}>
                      {item.itemName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.claimedBy
                        ? `Claimed by ${users[item.claimedBy]?.name ?? "someone"}`
                        : `Added by ${users[item.addedBy]?.name ?? "someone"}`}
                    </span>
                  </span>
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      onClaim(item.id, item.claimedBy !== userId).catch((error) =>
                        toast.error(error.message),
                      )
                    }
                  >
                    {item.claimedBy === userId ? "Unclaim" : "Claim"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CommonRoom({
  userId,
  bookings,
  users,
  onAdd,
  onRemove,
}: {
  userId: string;
  bookings: NonNullable<ReturnType<typeof useBookings>>;
  users: Record<string, { name: string }>;
  onAdd: (input: {
    date: string;
    startTime: string;
    endTime: string;
    note: string;
  }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const today = localDateISO();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(today, i)), [today]);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("21:00");
  const [note, setNote] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await onAdd({ date, startTime, endTime, note });
      setNote("");
      toast.success("Common room booked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not book that.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl font-normal">Common room</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((day) => {
            const count = bookings.filter((row) => row.date === day).length;
            const selected = day === date;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setDate(day)}
                className={`min-w-24 rounded-xl border px-3 py-2 text-left ${selected ? "border-primary bg-primary/5" : "bg-card"}`}
              >
                <p className="text-xs text-muted-foreground">{formatDayLabel(day)}</p>
                <p className="text-sm font-medium">{count === 0 ? "Open" : `${count} booked`}</p>
              </button>
            );
          })}
        </div>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="start">Starts</Label>
            <Input id="start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Ends</Label>
            <Input id="end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="note">Note</Label>
            <Input
              id="note"
              placeholder="Quiz review, quiet work, movie"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <Button type="submit" className="sm:col-span-2">
            Book {formatDayLabel(date)}
          </Button>
        </form>
        {bookings.filter((row) => row.date === date).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on the calendar for that day.</p>
        ) : (
          <ul className="space-y-2">
            {bookings
              .filter((row) => row.date === date)
              .map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {formatTime(row.startTime)} – {formatTime(row.endTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {users[row.bookedBy]?.name ?? "Member"}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </div>
                  {row.bookedBy === userId ? (
                    <Button size="sm" variant="ghost" onClick={() => onRemove(row.id)}>
                      Drop
                    </Button>
                  ) : (
                    <Badge variant="secondary">Held</Badge>
                  )}
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function formatHour(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric" });
}
