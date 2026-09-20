import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MODULE_COPY } from "@/core/copy";
import { MODULE_IDS, type CircleType, type ModuleId } from "@/core/types";
import { useApp } from "@/context/AppContext";

export function CreateCircleScreen() {
  const { store } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState<CircleType>("household");
  const [modules, setModules] = useState<ModuleId[]>(["logistics", "presence", "meetings", "notices"]);
  const [busy, setBusy] = useState(false);

  function setTypeAndDefaults(next: CircleType) {
    setType(next);
    setModules(
      next === "household"
        ? ["logistics", "presence", "meetings", "notices"]
        : ["free_tonight", "study_groups", "presence", "psets", "meetings", "notices"],
    );
  }

  function toggle(moduleId: ModuleId, on: boolean) {
    setModules((current) =>
      on ? Array.from(new Set([...current, moduleId])) : current.filter((id) => id !== moduleId),
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const circle = await store.createCircle({
        name,
        type,
        modulesEnabled: modules,
      });
      toast.success(`Share join code ${circle.joinCode}`);
      navigate(`/circles/${circle.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the circle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Create a circle</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You'll get a join code to text to the people who actually live or
          study with you. Course lists aren't auto-imported — someone in the
          class shares the code.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="circle-name">Name</Label>
              <Input
                id="circle-name"
                placeholder="Oak Street house"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Kind of group</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <TypeButton
                  selected={type === "household"}
                  title="Household"
                  body="Roommates, a suite, a floor kitchen."
                  onClick={() => setTypeAndDefaults("household")}
                />
                <TypeButton
                  selected={type === "campus_group"}
                  title="Campus group"
                  body="A class, recitation, or dorm floor."
                  onClick={() => setTypeAndDefaults("campus_group")}
                />
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Modules</legend>
              {(MODULE_IDS).map((moduleId) => (
                <label key={moduleId} className="flex items-start gap-3 rounded-xl border p-3">
                  <Checkbox
                    checked={modules.includes(moduleId)}
                    onCheckedChange={(value) => toggle(moduleId, value === true)}
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
              ))}
            </fieldset>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create circle"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function TypeButton({
  selected,
  title,
  body,
  onClick,
}: {
  selected: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left ${selected ? "border-primary bg-primary/5" : "bg-card"}`}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </button>
  );
}
