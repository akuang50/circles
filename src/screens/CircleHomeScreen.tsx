import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PersonChip } from "@/components/PersonChip";
import { EmptyState, ErrorState, LoadingState } from "@/components/Status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MODULE_COPY } from "@/core/copy";
import { MODULE_IDS, type ModuleId } from "@/core/types";
import { useApp } from "@/context/AppContext";
import { useCircle, useMembers, useUserMap } from "@/hooks/useStoreData";

const MODULE_ROUTES: Record<ModuleId, string> = {
  logistics: "household",
  free_tonight: "tonight",
  study_groups: "study",
  presence: "where",
  psets: "psets",
  meetings: "meetings",
  notices: "notices",
};

export function CircleHomeScreen() {
  const { circleId = "" } = useParams();
  const { store, user } = useApp();
  const navigate = useNavigate();
  const circle = useCircle(store, user?.uid, circleId);
  const members = useMembers(store, circleId);
  const users = useUserMap(store, members?.map((row) => row.userId) ?? []);

  if (!user) return null;
  if (circle === undefined || members === null) {
    return <LoadingState label="Opening the circle…" />;
  }
  if (!circle) {
    return (
      <ErrorState
        title="Circle not found"
        body="You may have left it, or the join code was for a different account."
      />
    );
  }

  const current = circle;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(current.joinCode);
      toast.success("Join code copied.");
    } catch {
      toast.message(current.joinCode);
    }
  }

  async function leave() {
    await store.leaveCircle(current.id);
    toast.message(`Left ${current.name}.`);
    navigate("/circles");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/circles" className="hover:underline">
              Circles
            </Link>
            <span className="px-1">/</span>
            {circle.type === "household" ? "Household" : "Campus group"}
          </p>
          <h1 className="font-serif text-3xl tracking-tight">{circle.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyCode}>
            Copy {circle.joinCode}
          </Button>
          <Button variant="outline" onClick={leave}>
            Leave
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {circle.modulesEnabled.length === 0 ? (
          <EmptyState
            title="No modules on this circle"
            body="Event buddy matching is still available from the Events tab. Turn on logistics, who's where, psets, meetings, or sightings from the module list below."
          />
        ) : (
          circle.modulesEnabled.map((moduleId) => (
            <Link key={moduleId} to={`/circles/${circle.id}/${MODULE_ROUTES[moduleId]}`}>
              <Card className="h-full transition hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="font-serif text-2xl font-normal">
                    {MODULE_COPY[moduleId].label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {MODULE_COPY[moduleId].blurb}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-serif text-2xl">Modules on this circle</h2>
          <p className="text-sm text-muted-foreground">
            Each module is opt-in for the whole circle. Who's where is named
            places only — never GPS. Psets and meetings are typed in by hand.
          </p>
        </div>
        <div className="grid gap-2">
          {MODULE_IDS.map((moduleId) => {
            const on = current.modulesEnabled.includes(moduleId);
            return (
              <label
                key={moduleId}
                className="flex items-start gap-3 rounded-xl border bg-card p-3"
              >
                <Checkbox
                  checked={on}
                  onCheckedChange={(value) => {
                    const next = value === true
                      ? Array.from(new Set([...current.modulesEnabled, moduleId]))
                      : current.modulesEnabled.filter((id) => id !== moduleId);
                    void store.setCircleModules(current.id, next).catch((error) => {
                      toast.error(
                        error instanceof Error ? error.message : "Could not update modules.",
                      );
                    });
                  }}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">
                    {MODULE_COPY[moduleId].label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {MODULE_COPY[moduleId].blurb}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Members</h2>
          <Badge variant="secondary">{members.length}</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((member) => {
            const person = users[member.userId];
            return (
              <div key={member.id} className="rounded-xl border bg-card px-3 py-3">
                <PersonChip
                  name={person?.name ?? "Someone in the circle"}
                  hint={member.role === "admin" ? "Admin" : "Member"}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
