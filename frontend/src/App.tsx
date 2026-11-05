import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight, BedDouble, CheckCircle2, Coffee, Dumbbell, KeyRound, LogOut, Menu,
  ShieldCheck, Sparkles, Star, Waves, Wifi, X
} from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "https://hotel-reservation-system2.onrender.com").replace(/\/$/, "");

type User = { id: string; name: string; email: string; role: "user" | "admin" };
type Room = { _id: string; roomNumber: string; type: "standard" | "deluxe" | "suite"; capacity: number; pricePerNight: number; isActive?: boolean };
type Booking = { _id: string; bookingReference: string; checkIn: string; checkOut: string; guests: number; totalPrice: number; status: "confirmed" | "cancelled"; room?: { roomNumber: string; type: string } };
type Envelope<T> = { success: boolean; data: T; error?: { message?: string } };

async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
  } catch {
    throw new Error("Could not reach StayPilot API. Please refresh and try again.");
  }
  const payload = await response.json() as Envelope<T>;
  if (!response.ok || !payload.success) throw new Error(payload.error?.message || `Request failed (${response.status})`);
  return payload.data;
}

const localDate = (date: Date) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
};
const today = () => localDate(new Date());
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return localDate(d); };
const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("staypilot_token") || "");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(tomorrow());
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [searched, setSearched] = useState(false);
  const [dashboard, setDashboard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType] = useState<Room["type"]>("standard");
  const [capacity, setCapacity] = useState(2);
  const [price, setPrice] = useState(2500);

  const nights = useMemo(() => {
    const n = (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    api<User>("/auth/me", {}, token).then(setUser).catch(() => {
      localStorage.removeItem("staypilot_token"); setToken(""); setUser(null);
      setError("Your session expired. Please sign in again.");
    });
  }, [token]);

  async function refreshDashboard() {
    if (!token) return;
    const mine = await api<Booking[]>("/bookings/mine", {}, token);
    setBookings(mine);
    if (user?.role === "admin") {
      const inventory = await api<{ rooms: Room[] }>("/rooms?limit=100", {}, token);
      setAllRooms(inventory.rooms);
    }
  }

  useEffect(() => {
    if (dashboard && user) refreshDashboard().catch(e => setError(e instanceof Error ? e.message : "Unable to load dashboard."));
  }, [dashboard, user, token]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await api<{ token: string; user: User }>(`/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify(authMode === "register" ? { name, email, password } : { email, password }),
      });
      localStorage.setItem("staypilot_token", result.token); setToken(result.token); setUser(result.user);
      setPassword(""); setMessage(authMode === "register" ? "Your account is ready. Welcome to StayPilot." : `Welcome back, ${result.user.name}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to authenticate."); }
    finally { setBusy(false); }
  }

  async function searchRooms(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault(); setBusy(true); setError(""); setMessage(""); setSearched(false);
    try {
      if (!nights) throw new Error("Check-out must be after check-in.");
      const q = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
      const result = await api<{ rooms: Room[]; count: number }>(`/rooms/availability?${q}`);
      setRooms(result.rooms); setSearched(true);
      setMessage(`${result.count} room(s) available for ${nights} night(s).`);
      document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to search rooms."); }
    finally { setBusy(false); }
  }

  async function bookRoom(roomId: string) {
    if (!token) { setError("Please sign in before reserving a room."); document.getElementById("account")?.scrollIntoView({ behavior: "smooth" }); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api<{ bookingReference: string; totalPrice: number }>("/bookings", { method: "POST", body: JSON.stringify({ roomId, checkIn, checkOut, guests }) }, token);
      setMessage(`Reservation confirmed · ${result.bookingReference} · ${money(result.totalPrice)}`);
      await searchRooms();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to complete reservation."); }
    finally { setBusy(false); }
  }

  async function addRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await api<Room>("/rooms", { method: "POST", body: JSON.stringify({ roomNumber, type: roomType, capacity, pricePerNight: price }) }, token);
      setRoomNumber(""); setMessage(`Room ${roomNumber} added to inventory.`);
      const inventory = await api<{ rooms: Room[] }>("/rooms?limit=100", {}, token); setAllRooms(inventory.rooms);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to add room."); }
    finally { setBusy(false); }
  }

  async function cancelBooking(id: string) {
    setBusy(true); setError(""); setMessage("");
    try { await api<Booking>(`/bookings/${id}/cancel`, { method: "PATCH" }, token); await refreshDashboard(); setMessage("Reservation cancelled."); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to cancel reservation."); }
    finally { setBusy(false); }
  }

  async function downloadInvoice(id: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/bookings/${id}/invoice`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Unable to download invoice.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `staypilot-invoice-${id}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : "Invoice download failed."); }
  }

  function logout() {
    localStorage.removeItem("staypilot_token"); setToken(""); setUser(null); setDashboard(false); setMessage("You have signed out.");
  }

  const roomCards = [
    { type: "standard", title: "Classic comfort", subtitle: "Thoughtful essentials for a restful stay.", image: "photo-1611892440504-42a792e24d32", price: "From ₹2,500", tag: "Essential" },
    { type: "deluxe", title: "Deluxe retreat", subtitle: "Extra space, elevated details, and a little more luxury.", image: "photo-1616486338812-3dadae4b4ace", price: "From ₹4,000", tag: "Guest favourite" },
    { type: "suite", title: "Signature suite", subtitle: "A generous suite for a truly special escape.", image: "photo-1611892440504-42a792e24d32", price: "From ₹7,000", tag: "Premium" },
  ];

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#202a27]">
      <div className="bg-[#173d37] px-4 py-2 text-center text-xs font-medium tracking-[.12em] text-white/90">A WARM WELCOME · A BETTER WAY TO STAY</div>
      <header className="sticky top-0 z-40 border-b border-[#e9e6df] bg-[#faf9f6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#" className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-[#173d37] text-[#e7c98c]"><BedDouble size={22}/></span><span><strong className="block text-lg tracking-[.2em]">STAYPILOT</strong><span className="text-[10px] uppercase tracking-[.22em] text-[#77817b]">Stay a little longer</span></span></a>
          <nav className="hidden items-center gap-8 text-sm text-[#58645e] md:flex"><a href="#rooms" className="hover:text-[#173d37]">Rooms</a><a href="#experience" className="hover:text-[#173d37]">Experience</a><a href="#amenities" className="hover:text-[#173d37]">Amenities</a><a href="#account" className="hover:text-[#173d37]">Contact</a></nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? <><button onClick={() => setDashboard(!dashboard)} className="rounded-full border border-[#d8ded8] px-4 py-2 text-sm hover:bg-white">Dashboard</button><span className="text-sm text-[#58645e]">Hi, {user.name.split(" ")[0]}</span><button onClick={logout} className="rounded-full bg-[#173d37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#24584e]"><LogOut className="mr-2 inline" size={15}/>Sign out</button></> : <a href="#account" className="rounded-full bg-[#173d37] px-6 py-3 text-sm font-semibold text-white hover:bg-[#24584e]">Sign in <ArrowRight className="ml-2 inline" size={15}/></a>}
          </div>
          <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
        </div>
        {mobileMenu && <div className="grid gap-3 border-t border-[#e9e6df] px-6 py-4 text-sm md:hidden"><a href="#rooms">Rooms</a><a href="#experience">Experience</a><a href="#amenities">Amenities</a><a href="#account">Account</a>{user && <button onClick={logout} className="text-left">Sign out</button>}</div>}
      </header>

      <section className="relative isolate min-h-[610px] overflow-hidden bg-[#173d37]">
        <div className="absolute inset-0 -z-20 bg-[url('https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2200&q=85')] bg-cover bg-center"/>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0d211e]/85 via-[#102a25]/55 to-[#102a25]/10"/>
        <div className="mx-auto flex max-w-7xl flex-col justify-center px-5 pb-44 pt-24 text-white lg:px-8 lg:pb-48 lg:pt-32">
          <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.28em] text-[#e8cf9c]"><Sparkles size={15}/> Your place to pause</p>
          <h1 className="max-w-3xl font-serif text-5xl leading-[1.08] sm:text-6xl lg:text-7xl">A stay worth <em className="font-normal text-[#f0d9a9]">remembering.</em></h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-white/80 sm:text-lg">Find your own kind of comfort. Discover welcoming rooms, thoughtful amenities, and the little details that make every journey feel special.</p>
          <a href="#rooms" className="mt-9 inline-flex w-fit items-center gap-3 border-b border-[#e8cf9c] pb-2 text-sm font-semibold uppercase tracking-[.16em] text-[#f0d9a9]">Explore your stay <ArrowRight size={17}/></a>
        </div>
        <form onSubmit={searchRooms} className="absolute inset-x-5 bottom-0 mx-auto grid max-w-6xl gap-3 rounded-t-2xl bg-white p-5 text-[#26332e] shadow-2xl sm:grid-cols-2 lg:grid-cols-[1fr_1fr_.8fr_auto] lg:items-end lg:gap-5 lg:px-8 lg:py-7">
          <label className="text-xs font-semibold uppercase tracking-[.12em] text-[#65716b]">Check-in<input required min={today()} type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="mt-2 block w-full border-b border-[#d9ded9] bg-transparent py-3 text-base font-medium text-[#26332e] outline-none focus:border-[#1d5147]"/></label>
          <label className="text-xs font-semibold uppercase tracking-[.12em] text-[#65716b]">Check-out<input required min={checkIn} type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="mt-2 block w-full border-b border-[#d9ded9] bg-transparent py-3 text-base font-medium text-[#26332e] outline-none focus:border-[#1d5147]"/></label>
          <label className="text-xs font-semibold uppercase tracking-[.12em] text-[#65716b]">Guests<select value={guests} onChange={e => setGuests(Number(e.target.value))} className="mt-2 block w-full border-b border-[#d9ded9] bg-transparent py-3 text-base font-medium outline-none focus:border-[#1d5147]">{Array.from({length:20},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} guest{n>1?"s":""}</option>)}</select></label>
          <button disabled={busy} className="rounded-full bg-[#173d37] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#24584e] disabled:opacity-60"><span className="inline-flex items-center gap-2"><KeyRound size={16}/>{busy?"Searching…":"Search rooms"}</span></button>
        </form>
      </section>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {(message || error) && <div role="status" className={`mt-6 rounded-xl border px-4 py-3 text-sm ${error?"border-rose-200 bg-rose-50 text-rose-800":"border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{error || message}</div>}

        {searched && <section id="rooms" className="scroll-mt-28 py-16"><div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#a17c3f]">Live availability</p><h2 className="mt-2 font-serif text-4xl">Rooms for your dates</h2></div><span className="text-sm text-[#65716b]">{rooms.length} result(s) · {nights} night(s)</span></div>{rooms.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{rooms.map(room=><article key={room._id} className="overflow-hidden rounded-2xl border border-[#e7e4dc] bg-white shadow-sm"><img src={room.type==="suite"?"https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80":room.type==="deluxe"?"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80":"https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80"} alt={`${room.type} hotel room`} className="h-52 w-full object-cover"/><div className="p-5"><p className="text-xs uppercase tracking-[.16em] text-[#a17c3f]">{room.type} · Room {room.roomNumber}</p><h3 className="mt-2 font-serif text-2xl">{room.type==="suite"?"Signature suite":room.type==="deluxe"?"Deluxe retreat":"Classic room"}</h3><p className="mt-2 text-sm text-[#6e7972]">Comfortably accommodates up to {room.capacity} guests.</p><div className="mt-5 flex items-end justify-between"><p className="text-xl font-semibold">{money(room.pricePerNight)}<span className="text-xs font-normal text-[#7c857f]"> / night</span></p><button disabled={busy} onClick={()=>void bookRoom(room._id)} className="rounded-full bg-[#173d37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#24584e]">Reserve</button></div><p className="mt-2 text-xs text-[#7c857f]">{money(room.pricePerNight*nights)} total for {nights} night(s)</p></div></article>)}</div>:<div className="rounded-2xl bg-white p-10 text-center"><BedDouble className="mx-auto text-[#9aab9f]" size={32}/><h3 className="mt-3 font-serif text-2xl">No rooms available just yet</h3><p className="mt-2 text-sm text-[#6e7972]">Try different dates, or check back soon as our inventory is updated.</p></div>}</section>}

        <section id="experience" className="grid items-center gap-10 py-20 lg:grid-cols-2 lg:gap-20">
          <div className="relative"><img src="https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85" alt="Elegant hotel bedroom" className="h-[420px] w-full rounded-sm object-cover"/><div className="absolute -bottom-5 -right-3 bg-[#e9d7b3] px-7 py-5 text-[#26332e] shadow-lg sm:-right-5"><p className="font-serif text-3xl">Stay well.</p><p className="mt-1 text-xs uppercase tracking-[.15em]">Feel at home</p></div></div>
          <div className="py-5"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#a17c3f]">The StayPilot feeling</p><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Comfort is in the details.</h2><p className="mt-6 text-base leading-8 text-[#68736d]">Whether you are here for a quick city break or a longer escape, we make it simple to find a room that fits your plans. Thoughtful spaces, easy reservations, and a warm welcome are always part of the experience.</p><div className="mt-8 flex items-center gap-2 text-sm font-semibold text-[#173d37]"><Star size={17} className="fill-[#d5b678] text-[#b38a47}"/> Thoughtful stays, made simple</div></div>
        </section>

        <section id="rooms" className="scroll-mt-24 py-14"><div className="mb-8 text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#a17c3f]">Find your perfect fit</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">Rooms & suites</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#68736d]">A space for every kind of traveller, with comfort at the heart of every detail.</p></div><div className="grid gap-6 md:grid-cols-3">{roomCards.map(card=><article key={card.type} className="group overflow-hidden bg-white shadow-sm"><div className="relative overflow-hidden"><img src={`https://images.unsplash.com/${card.image}?auto=format&fit=crop&w=900&q=80`} alt={card.title} className="h-64 w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute left-4 top-4 bg-white/95 px-3 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#173d37]">{card.tag}</span></div><div className="border border-t-0 border-[#e7e4dc] p-6"><h3 className="font-serif text-2xl">{card.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-[#68736d]">{card.subtitle}</p><div className="mt-5 flex items-center justify-between border-t border-[#ece9e2] pt-4"><span className="text-sm font-semibold">{card.price}</span><a href="#booking" onClick={()=>document.getElementById("booking")?.scrollIntoView({behavior:"smooth"})} className="text-xs font-bold uppercase tracking-[.12em] text-[#1d5147]">Book now <ArrowRight className="ml-1 inline" size={14}/></a></div></div></article>)}</div></section>

        <section id="amenities" className="my-16 bg-[#173d37] px-6 py-14 text-white sm:px-12"><div className="mx-auto max-w-5xl"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#e8cf9c]">Made for your comfort</p><h2 className="mt-3 font-serif text-4xl">A few thoughtful extras</h2></div><div className="mt-10 grid grid-cols-2 gap-8 text-center sm:grid-cols-4"><div><Wifi className="mx-auto text-[#e8cf9c]" size={25}/><p className="mt-3 text-sm">Complimentary Wi-Fi</p></div><div><Coffee className="mx-auto text-[#e8cf9c]" size={25}/><p className="mt-3 text-sm">Breakfast options</p></div><div><Dumbbell className="mx-auto text-[#e8cf9c]" size={25}/><p className="mt-3 text-sm">Fitness space</p></div><div><Waves className="mx-auto text-[#e8cf9c]" size={25}/><p className="mt-3 text-sm">Relax & unwind</p></div></div></div></section>

        {dashboard && user && <section className="mb-16 rounded-2xl border border-[#e6e2d8] bg-white p-6 sm:p-9"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#a17c3f]">Your account</p><h2 className="mt-2 font-serif text-3xl">{user.role==="admin"?"Admin dashboard":"My reservations"}</h2><p className="mt-1 text-sm text-[#68736d]">{user.name} · {user.email}</p></div><span className="rounded-full bg-[#e9f0eb] px-4 py-2 text-xs font-semibold uppercase text-[#1d5147]">{user.role}</span></div>
          {user.role==="admin" && <div className="mt-8 grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={addRoom} className="rounded-xl bg-[#f6f5f0] p-5"><h3 className="font-serif text-2xl">Add a room</h3><p className="mb-5 mt-1 text-xs text-[#68736d]">Add a room to the live hotel inventory.</p><label className="mb-3 block text-xs font-semibold text-[#59665f]">Room number<input required value={roomNumber} onChange={e=>setRoomNumber(e.target.value)} placeholder="e.g. 101" className="mt-2 w-full rounded-lg border border-[#dfe3dc] bg-white px-3 py-3 text-sm"/></label><label className="mb-3 block text-xs font-semibold text-[#59665f]">Room type<select value={roomType} onChange={e=>setRoomType(e.target.value as Room["type"])} className="mt-2 w-full rounded-lg border border-[#dfe3dc] bg-white px-3 py-3 text-sm"><option value="standard">Standard</option><option value="deluxe">Deluxe</option><option value="suite">Suite</option></select></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-[#59665f]">Capacity<input type="number" min="1" max="20" value={capacity} onChange={e=>setCapacity(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-[#dfe3dc] bg-white px-3 py-3 text-sm"/></label><label className="text-xs font-semibold text-[#59665f]">Price / night<input type="number" min="0" value={price} onChange={e=>setPrice(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-[#dfe3dc] bg-white px-3 py-3 text-sm"/></label></div><button disabled={busy} className="mt-5 w-full rounded-full bg-[#173d37] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy?"Saving…":"Add room to inventory"}</button></form><div><h3 className="font-serif text-2xl">Room inventory <span className="font-sans text-sm text-[#68736d]">({allRooms.length})</span></h3><div className="mt-4 divide-y divide-[#ece9e2]">{allRooms.length?allRooms.map(r=><div key={r._id} className="flex items-center justify-between gap-3 py-3 text-sm"><span><strong>Room {r.roomNumber}</strong><span className="ml-2 capitalize text-[#68736d]">{r.type} · {r.capacity} guests</span></span><strong>{money(r.pricePerNight)}</strong></div>):<p className="rounded-xl bg-[#f6f5f0] p-5 text-sm text-[#68736d]">No rooms added yet. Use the form to create your first room.</p>}</div></div></div>}
          <h3 className="mt-9 font-serif text-2xl">Reservation history</h3><div className="mt-4 divide-y divide-[#ece9e2]">{bookings.length?bookings.map(b=><div key={b._id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-semibold">{b.bookingReference} · Room {b.room?.roomNumber||"—"}</p><p className="mt-1 text-xs text-[#68736d]">{new Date(b.checkIn).toLocaleDateString()} – {new Date(b.checkOut).toLocaleDateString()} · {money(b.totalPrice)} · {b.status}</p></div><div className="flex gap-2"><button onClick={()=>void downloadInvoice(b._id)} className="rounded-full border border-[#d8ded8] px-4 py-2 text-xs">Invoice</button>{b.status==="confirmed"&&<button onClick={()=>void cancelBooking(b._id)} className="rounded-full border border-rose-200 px-4 py-2 text-xs text-rose-700">Cancel</button>}</div></div>):<p className="rounded-xl bg-[#f6f5f0] p-5 text-sm text-[#68736d]">No reservations yet.</p>}</div>
        </section>}

        <section id="account" className="scroll-mt-24 grid gap-10 border-t border-[#e7e4dc] py-16 lg:grid-cols-[.9fr_1.1fr]"><div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#a17c3f]">A warm welcome awaits</p><h2 className="mt-3 max-w-md font-serif text-4xl">Make yourself at home.</h2><p className="mt-4 max-w-md text-sm leading-7 text-[#68736d]">Create an account to manage your reservations, keep your invoices close, and make your next stay even easier.</p><div className="mt-7 flex items-center gap-3 text-sm text-[#526159]"><ShieldCheck className="text-[#1d5147]" size={19}/> Secure, account-protected reservations</div><div className="mt-3 flex items-center gap-3 text-sm text-[#526159]"><CheckCircle2 className="text-[#1d5147]" size={19}/> Your bookings, all in one place</div></div>
          {!user?<form id="booking" onSubmit={submitAuth} className="rounded-2xl border border-[#e7e4dc] bg-white p-6 shadow-sm sm:p-8"><div className="mb-6 flex gap-2"><button type="button" onClick={()=>setAuthMode("login")} className={`rounded-full px-5 py-2 text-sm font-semibold ${authMode==="login"?"bg-[#173d37] text-white":"bg-[#f1f1eb] text-[#53615a]"}`}>Sign in</button><button type="button" onClick={()=>setAuthMode("register")} className={`rounded-full px-5 py-2 text-sm font-semibold ${authMode==="register"?"bg-[#173d37] text-white":"bg-[#f1f1eb] text-[#53615a]"}`}>Create account</button></div>{authMode==="register"&&<label className="mb-4 block text-sm text-[#59665f]">Full name<input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border border-[#dfe3dc] px-3 py-3"/></label>}<label className="mb-4 block text-sm text-[#59665f]">Email address<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-[#dfe3dc] px-3 py-3"/></label><label className="block text-sm text-[#59665f]">Password<input required type="password" minLength={authMode==="register"?8:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-[#dfe3dc] px-3 py-3"/></label><button disabled={busy} className="mt-6 w-full rounded-full bg-[#173d37] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#24584e] disabled:opacity-60">{busy?"Please wait…":authMode==="login"?"Sign in to your account":"Create your account"}</button></form>:<div className="rounded-2xl border border-[#dce8df] bg-white p-8"><p className="font-serif text-2xl">Welcome, {user.name}.</p><p className="mt-2 text-sm text-[#68736d]">You are signed in as {user.role}. Open your dashboard to manage your StayPilot account.</p><button onClick={()=>setDashboard(true)} className="mt-5 rounded-full bg-[#173d37] px-6 py-3 text-sm font-semibold text-white">Open dashboard <ArrowRight className="ml-2 inline" size={15}/></button></div>}
        </section>
      </div>
      <footer className="bg-[#102b26] px-5 py-10 text-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="font-serif text-2xl tracking-widest">STAYPILOT</p><p className="mt-1 text-xs text-white/55">A better stay begins here.</p></div><p className="text-xs text-white/55">© {new Date().getFullYear()} StayPilot · Hotel reservations</p></div></footer>
    </main>
  );
}
export default App;
