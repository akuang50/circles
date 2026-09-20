import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, ErrorState, LoadingState } from "@/components/Status";
import { PersonChip } from "@/components/PersonChip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { claimsByPset } from "@/core/boards";
import { addDaysISO, formatDayLabel, localDateISO } from "@/core/time";
import { useApp } from "@/context/AppContext";
import { useCircle, usePsets, useUserMap } from "@/hooks/useStoreData";

export function PsetsScreen() {
  const { circleId = "" } = useParams();
  const { store, user } = useApp();
  const circle = useCircle(store, user?.uid, circleId);
  const payload = usePsets(store, circleId);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(addDaysISO(localDateISO(), 7));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const users = useUserMap(
    store,
    Array.from(
      new Set([
        ...(payload?.psets.map((row) => row.addedBy) ?? []),
        ...(payload?.claims.map((row) => row.userId) ?? []),
      ]),
    ),
  );

  if (!user) return null;
  if (circle === undefined || !payload) {
    return <LoadingState label="Loading the pset board…" />;
  }
  if (!circle) {
    return (
      <ErrorState title="Circle not found" body="This course group isn't on your account." />
    );
  }
  if (!circle.modulesEnabled.includes("psets")) {
    return (
      <ErrorState
        title="Psets isn't on"
        body="Turn this on for a campus circle from the circle home. We don't import from Canvas."
      />
    );
  }

  const byPset = claimsByPset(payload.claims);
  const current = circle;

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await store.addPset({ circleId: current.id, title, dueDate, note });
      setTitle("");
      setNote("");
      toast.success("Pset added to the board.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the pset.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(psetId: string, on: boolean) {
    try {
      await store.setPsetClaim(psetId, on);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update that.");
    }
  }

  async function remove(psetId: string) {
    try {
      await store.removePset(psetId);
      toast.message("Pset removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove it.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to={`/circles/${circle.id}`} className="hover:underline">
            {circle.name}
          </Link>
          <span className="px-1">/</span>
          Psets
        </p>
        <h1 className="font-serif text-3xl tracking-tight">Who's on which pset</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Add problem sets by hand — short name, due date, optional note. Mark
          the ones you're working on so this circle can see who's on Pset 3
          without scraping Canvas or any LMS.
        </p>
      </div>

      <form
        onSubmit={onAdd}
        className="space-y-3 rounded-2xl border bg-card px-4 py-4"
      >
        <h2 className="font-medium">Add a pset</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pset-title">Short name</Label>
            <Input
              id="pset-title"
              placeholder="Pset 3"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pset-due">Due</Label>
            <Input
              id="pset-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="pset-note">Note (optional)</Label>
          <Textarea
            id="pset-note"
            placeholder="Graphs chapter, or 'office hours Thursday'"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add to the board"}
        </Button>
      </form>

      {payload.psets.length === 0 ? (
        <EmptyState
          title="No psets on the board yet"
          body="Someone in this circle can add Pset 3 (or whatever the short name is). Until then, this stays empty — we will not pull from Canvas."
        />
      ) : (
        <ul className="space-y-3">
          {payload.psets.map((pset) => {
            const people = byPset.get(pset.id) ?? [];
            const mineOn = people.some((row) => row.userId === user.uid);
            return (
              <li key={pset.id} className="space-y-3 rounded-2xl border bg-card px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-xl">{pset.title}</h3>
                      <Badge variant="secondary">Due {formatDayLabel(pset.dueDate)}</Badge>
                    </div>
                    {pset.note ? (
                      <p className="mt-1 text-sm text-muted-foreground">{pset.note}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Added by {users[pset.addedBy]?.name ?? "a member"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={mineOn ? "default" : "outline"}
                      onClick={() => toggle(pset.id, !mineOn)}
                    >
                      {mineOn ? "I'm on this" : "I'm working on this"}
                    </Button>
                    {pset.addedBy === user.uid ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(pset.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                {people.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nobody has marked this yet.
                  </p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {people.map((row) => (
                      <li key={row.id}>
                        <PersonChip
                          name={users[row.userId]?.name ?? "Someone in the circle"}
                          hint="Working on this pset"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
