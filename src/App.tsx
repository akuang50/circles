import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { LoadingState } from "@/components/Status";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "@/context/AppContext";
import { CircleHomeScreen } from "@/screens/CircleHomeScreen";
import { CirclesScreen } from "@/screens/CirclesScreen";
import { CreateCircleScreen } from "@/screens/CreateCircleScreen";
import { EventBuddyScreen } from "@/screens/EventBuddyScreen";
import { FreeTonightScreen } from "@/screens/FreeTonightScreen";
import { HouseholdScreen } from "@/screens/HouseholdScreen";
import { JoinCircleScreen } from "@/screens/JoinCircleScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { StudyGroupsScreen } from "@/screens/StudyGroupsScreen";

const basename =
  import.meta.env.BASE_URL === "/"
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename={basename}>
        <Toaster position="top-center" />
        <Gate />
      </BrowserRouter>
    </AppProvider>
  );
}

function Gate() {
  const { user, ready } = useApp();
  if (!ready) return <LoadingState label="Opening Circles…" className="min-h-svh" />;
  if (!user) return <LoginScreen />;
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/circles" replace />} />
        <Route path="/circles" element={<CirclesScreen />} />
        <Route path="/new" element={<CreateCircleScreen />} />
        <Route path="/join" element={<JoinCircleScreen />} />
        <Route path="/circles/:circleId" element={<CircleHomeScreen />} />
        <Route path="/circles/:circleId/household" element={<HouseholdScreen />} />
        <Route path="/circles/:circleId/tonight" element={<FreeTonightScreen />} />
        <Route path="/circles/:circleId/study" element={<StudyGroupsScreen />} />
        <Route path="/events" element={<EventBuddyScreen />} />
        <Route path="/you" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/circles" replace />} />
      </Route>
    </Routes>
  );
}
