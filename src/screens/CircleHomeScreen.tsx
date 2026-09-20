import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PersonChip } from "@/components/PersonChip";
import { EmptyState, ErrorState, LoadingState } from "@/components/Status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODULE_COPY } from "@/core/copy";
import type { ModuleId } from "@/core/types";
import { useApp } from "@/context/AppContext";
import { useCircle, useMembers, useUserMap } from "@/hooks/useStoreData";

const MODULE_ROUTES: Record<ModuleId, string> = {
  logistics: "household",
  free_tonight: "tonight",
  study_groups: "study",
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
            body="Event buddy matching is still available from the Events tab. Recreate the circle if you meant to turn on logistics, free tonight, or study groups."
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
