import { useEffect, useRef, useState } from "react";
import "./App.css";
import { NavBar } from "./components";
import { DEFAULT_GOALS, load, save } from "./lib";
import {
  supabase, fetchMeals, insertMeal, removeMeal, removeAllMeals, fetchProfile, saveProfile,
  fetchMyFoods, insertMyFood, removeMyFood,
} from "./db";
import Onboarding from "./screens/Onboarding";
import Login from "./screens/Login";
import Dashboard from "./screens/Dashboard";
import Scanner from "./screens/Scanner";
import History from "./screens/History";
import Insights from "./screens/Insights";
import Profile from "./screens/Profile";

export default function App() {
  const [onboarded, setOnboarded] = useState(() => load("onboarded", false));
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [meals, setMeals] = useState([]);
  const [myFoods, setMyFoods] = useState([]);
  const [profile, setProfile] = useState({ name: "", goals: DEFAULT_GOALS });
  const [dataReady, setDataReady] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("home");
  const profileLoaded = useRef(false);

  const userId = session?.user?.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    profileLoaded.current = false;
    setDataReady(false);

    (async () => {
      try {
        const [m, p, f] = await Promise.all([fetchMeals(), fetchProfile(), fetchMyFoods()]);
        if (cancelled) return;
        setMeals(m);
        setMyFoods(f);
        if (p) {
          setProfile(p);
        } else {
          const fresh = { name: session.user.user_metadata?.name || "", goals: DEFAULT_GOALS };
          setProfile(fresh);
          await saveProfile(userId, fresh);
        }
        profileLoaded.current = true;
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setDataReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!userId || !profileLoaded.current) return;
    const t = setTimeout(() => {
      saveProfile(userId, profile).catch((e) => setError(e.message));
    }, 800);
    return () => clearTimeout(t);
  }, [profile, userId]);

  if (!onboarded) {
    return <Onboarding onDone={() => { save("onboarded", true); setOnboarded(true); }} />;
  }
  if (!authReady) return <div className="loading-screen">Loading…</div>;
  if (!session) return <Login />;
  if (!dataReady) return <div className="loading-screen">Loading your meals…</div>;

  async function addMeal(meal) {
    try {
      const saved = await insertMeal(meal);
      setMeals((prev) => [saved, ...prev]);
      setTab("home");
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteMeal(id) {
    const before = meals;
    setMeals((prev) => prev.filter((m) => m.id !== id));
    try {
      await removeMeal(id);
    } catch (e) {
      setMeals(before);
      setError(e.message);
    }
  }

  async function resetMeals() {
    try {
      await removeAllMeals();
      setMeals([]);
    } catch (e) {
      setError(e.message);
    }
  }

  async function addMyFood(food) {
    try {
      const saved = await insertMyFood(food);
      setMyFoods((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  async function deleteMyFood(id) {
    const before = myFoods;
    setMyFoods((prev) => prev.filter((f) => f.id !== id));
    try {
      await removeMyFood(id);
    } catch (e) {
      setMyFoods(before);
      setError(e.message);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setMeals([]);
    setMyFoods([]);
    setTab("home");
  }

  return (
    <div className="shell">
      {error && (
        <button className="toast" onClick={() => setError(null)}>⚠️ {error}</button>
      )}
      {tab === "home" && <Dashboard meals={meals} profile={profile} onScan={() => setTab("scan")} onDelete={deleteMeal} />}
      {tab === "history" && <History meals={meals} goal={profile.goals.calories} onDelete={deleteMeal} />}
      {tab === "scan" && (
        <Scanner goals={profile.goals} myFoods={myFoods} onBack={() => setTab("home")} onSave={addMeal} />
      )}
      {tab === "insights" && <Insights meals={meals} goals={profile.goals} />}
      {tab === "profile" && (
        <Profile
          profile={profile}
          setProfile={setProfile}
          meals={meals}
          email={session.user.email}
          myFoods={myFoods}
          onAddFood={addMyFood}
          onDeleteFood={deleteMyFood}
          onReset={resetMeals}
          onLogout={logout}
        />
      )}
      {tab !== "scan" && <NavBar tab={tab} setTab={setTab} />}
    </div>
  );
}
