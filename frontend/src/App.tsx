import { useEffect, useMemo, useState } from "react";
import { BedDouble, CalendarDays, CheckCircle2, LogIn, LogOut, Search, ShieldCheck, UserRound } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

type User = { id: string; name: string; email: string; role: "user" | "admin" };
type Room = { _id: string; roomNumber: string; type: "standard" | "deluxe" | "suite"; capacity: number; pricePerNight: number };
type ApiEnvelope<T> = { success: boolean; data: T; error?: { message?: string } };

async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || `Request failed (${response.status})`);
  }
  return payload.data;
}

function todayString() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("staypilot_token") || "");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkIn, setCheckIn] = useState(todayString());
  const [checkOut, setCheckOut] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  });
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const nights = useMemo(() => {
    const value = (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000;
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    api<User>("/auth/me", {}, token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("staypilot_token");
        setToken("");
        setUser(null);
      });
  }, [token]);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api<{ token: string; user: User }>(`/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify(authMode === "register" ? { name, email, password } : { email, password }),
      });
      localStorage.setItem("staypilot_token", result.token);
      setToken(result.token);
      setUser(result.user);
      setPassword("");
      setMessage(authMode === "register" ? "Your account is ready. You can now reserve a room." : "Welcome back!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to authenticate.");
    } finally { setBusy(false); }
  }

  async function searchRooms(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage(""); setSearched(false);
    try {
      if (!nights) throw new Error("Check-out must be after check-in.");
      const query = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
      const result = await api<{ rooms: Room[]; count: number }>(`/rooms/availability?${query.toString()}`);
      setRooms(result.rooms);
      setSearched(true);
      setMessage(`${result.count} available room(s) found for ${nights} night(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search rooms.");
    } finally { setBusy(false); }
  }

  async function bookRoom(roomId: string) {
    if (!token) {
      setError("Please sign in before booking a room.");
      document.getElementById("account")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const booking = await api<{ bookingReference: string; totalPrice: number }>("/bookings", {
        method: "POST",
        body: JSON.stringify({ roomId, checkIn, checkOut, guests }),
      }, token);
      setMessage(`Reservation confirmed! Reference: ${booking.bookingReference}. Total: ₹${booking.totalPrice.toLocaleString("en-IN")}.`);
      await searchRooms(new Event("submit") as unknown as React.FormEvent<HTMLFormElement>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete booking.");
    } finally { setBusy(false); }
  }

  function logout() {
    localStorage.removeItem("staypilot_token");
    setToken(""); setUser(null); setMessage("You have been signed out.");
  }

  return (
    <main className="min-h-screen bg-[#080d18] text-slate-100">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(69,94,145,0.22),transparent_65%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <a href="#" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-amber-200/20 bg-amber-100/10 text-amber-200"><BedDouble size={21} /></span>
            <span><span className="block text-sm font-semibold tracking-[0.18em]">STAYPILOT</span><span className="mt-1 block text-xs text-slate-500">Hotel reservations</span></span>
          </a>
          {user ? (
            <div className="flex items-center gap-3 text-sm"><span className="hidden text-slate-300 sm:inline">Hi, {user.name}</span><button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-slate-200 hover:bg-white/5"><LogOut size={16} /> Sign out</button></div>
          ) : <a href="#account" className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">Sign in</a>}
        </header>

        <section className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-200"><span className="size-1.5 rounded-full bg-emerald-300" /> Live reservation search</div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">Find a stay that feels <span className="bg-gradient-to-r from-amber-100 to-orange-300 bg-clip-text text-transparent">just right.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">Search real room inventory, check availability for your dates, and reserve securely with your account.</p>
            <div className="mt-8 flex flex-wrap gap-5 text-xs text-slate-400"><span className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-300" /> Account-protected bookings</span><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-300" /> Live availability</span></div>
          </div>

          <form onSubmit={searchRooms} className="rounded-3xl border border-white/10 bg-[#101827]/90 p-6 shadow-2xl shadow-black/30 sm:p-8">
            <div className="mb-6 flex items-center gap-3"><span className="rounded-xl bg-amber-100/10 p-3 text-amber-200"><Search size={20} /></span><div><h2 className="text-xl font-semibold">Search rooms</h2><p className="text-sm text-slate-400">Choose your stay details</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-300">Check-in<input required min={todayString()} type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-3 text-white" /></label>
              <label className="text-sm text-slate-300">Check-out<input required min={checkIn} type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-3 text-white" /></label>
              <label className="text-sm text-slate-300 sm:col-span-2">Guests<select value={guests} onChange={e => setGuests(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-3 text-white">{Array.from({ length: 20 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>)}</select></label>
            </div>
            <button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-200 px-5 py-3.5 font-semibold text-slate-950 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"><Search size={17} /> {busy ? "Please wait…" : "Check availability"}</button>
          </form>
        </section>

        {(message || error) && <div role="status" className={`mb-6 rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"}`}>{error || message}</div>}

        {searched && <section className="pb-12"><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-semibold tracking-[0.2em] text-amber-200">AVAILABLE INVENTORY</p><h2 className="mt-2 text-2xl font-semibold">Rooms for your stay</h2></div><span className="text-sm text-slate-400">{rooms.length} result(s)</span></div>
          {rooms.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rooms.map(room => <article key={room._id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-start justify-between"><span className="rounded-lg bg-amber-100/10 p-2 text-amber-200"><BedDouble size={20} /></span><span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-slate-300">{room.type}</span></div><h3 className="mt-5 text-lg font-semibold">Room {room.roomNumber}</h3><p className="mt-1 text-sm text-slate-400">Up to {room.capacity} guests</p><p className="mt-5 text-2xl font-semibold">₹{room.pricePerNight.toLocaleString("en-IN")}<span className="text-sm font-normal text-slate-500"> / night</span></p><p className="mt-1 text-xs text-slate-500">₹{(room.pricePerNight * nights).toLocaleString("en-IN")} total · {nights} night(s)</p><button disabled={busy} onClick={() => void bookRoom(room._id)} className="mt-5 w-full rounded-xl bg-amber-200 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-100 disabled:opacity-60">Reserve this room</button></article>)}</div> : <p className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-slate-400">No rooms are available for those dates. Try changing your dates or guest count.</p>}
        </section>}

        <section id="account" className="grid gap-8 border-t border-white/10 py-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div><p className="text-xs font-semibold tracking-[0.2em] text-amber-200">YOUR ACCOUNT</p><h2 className="mt-3 text-2xl font-semibold">A smoother stay starts here.</h2><p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Sign in or create an account to reserve a room. Your booking identity is taken from your verified account profile.</p>{user && <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4"><UserRound className="text-emerald-200" /><div><p className="font-medium">{user.name}</p><p className="text-xs text-slate-400">{user.email}</p></div></div>}</div>
          {!user ? <form onSubmit={submitAuth} className="rounded-2xl border border-white/10 bg-[#101827]/80 p-6">
            <div className="mb-5 flex gap-2"><button type="button" onClick={() => setAuthMode("login")} className={`rounded-lg px-4 py-2 text-sm ${authMode === "login" ? "bg-amber-200 text-slate-950" : "bg-white/5 text-slate-300"}`}>Sign in</button><button type="button" onClick={() => setAuthMode("register")} className={`rounded-lg px-4 py-2 text-sm ${authMode === "register" ? "bg-amber-200 text-slate-950" : "bg-white/5 text-slate-300"}`}>Create account</button></div>
            {authMode === "register" && <label className="mb-4 block text-sm text-slate-300">Full name<input required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-3" /></label>}
            <label className="mb-4 block text-sm text-slate-300">Email<input required type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-3" /></label>
            <label className="block text-sm text-slate-300">Password<input required type="password" minLength={authMode === "register" ? 8 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 py-3" /></label>
            <button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"><LogIn size={17} /> {busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</button>
          </form> : <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-6"><p className="font-semibold text-emerald-100">You are signed in</p><p className="mt-2 text-sm text-slate-400">Search availability above and reserve an available room. You can sign out at any time.</p></div>}
        </section>
        <footer className="flex flex-col justify-between gap-3 border-t border-white/10 py-6 text-xs text-slate-500 sm:flex-row"><span>StayPilot · Hotel Reservation System</span><span className="inline-flex items-center gap-2"><CalendarDays size={14} /> React · Express · MongoDB</span></footer>
      </div>
    </main>
  );
}

export default App;
