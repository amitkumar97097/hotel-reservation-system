import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BedDouble, CalendarDays, Check, CheckCircle2, ChevronDown,
  Coffee, Dumbbell, Heart, LogIn, LogOut, MapPin, Menu, Search, ShieldCheck,
  Sparkles, Star, SwimmingPool, UserRound, Wifi, X
} from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
type User = { id: string; name: string; email: string; role: "user" | "admin" };
type Room = { _id: string; roomNumber: string; type: "standard" | "deluxe" | "suite"; capacity: number; pricePerNight: number; isActive?: boolean };
type Booking = { _id: string; bookingReference: string; checkIn: string; checkOut: string; guests: number; totalPrice: number; status: "confirmed" | "cancelled"; room?: { roomNumber: string; type: string } };
type ApiEnvelope<T> = { success: boolean; data: T; error?: { message?: string } };

async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  if (!API_URL) throw new Error("API URL is not configured. Please set VITE_API_URL in Vercel.");
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success) throw new Error(payload.error?.message || `Request failed (${response.status})`);
  return payload.data;
}
function todayString() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}
function tomorrowString() {
  const date = new Date(); date.setDate(date.getDate() + 1);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const roomShowcase = [
  { title: "Classic Room", detail: "Thoughtful comfort for a restful night", price: "From ₹2,500", image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85", tag: "ESSENTIAL COMFORT" },
  { title: "Deluxe Room", detail: "More space, elevated details, better views", price: "From ₹4,000", image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85", tag: "GUEST FAVOURITE" },
  { title: "Signature Suite", detail: "A little more room for a special escape", price: "From ₹7,000", image: "https://images.unsplash.com/photo-1611892440504-0a5b9c5f0c4b?auto=format&fit=crop&w=1000&q=85", tag: "EXTRAORDINARY STAYS" },
];

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("staypilot_token") || "");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [checkIn, setCheckIn] = useState(todayString()); const [checkOut, setCheckOut] = useState(tomorrowString());
  const [guests, setGuests] = useState(1); const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]); const [showDashboard, setShowDashboard] = useState(false);
  const [searched, setSearched] = useState(false); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [mobileMenu, setMobileMenu] = useState(false);
  const nights = useMemo(() => {
    const value = (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000;
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (!token) { setUser(null); return; }
    api<User>("/auth/me", {}, token).then(setUser).catch(() => {
      localStorage.removeItem("staypilot_token"); setToken(""); setUser(null);
    });
  }, [token]);

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await api<{ token: string; user: User }>(`/auth/${authMode}`, {
        method: "POST", body: JSON.stringify(authMode === "register" ? { name, email, password } : { email, password }),
      });
      localStorage.setItem("staypilot_token", result.token); setToken(result.token); setUser(result.user); setPassword("");
      setMessage(authMode === "register" ? "Your account is ready. Welcome to StayPilot." : "Welcome back. Your stay awaits.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to authenticate."); }
    finally { setBusy(false); }
  }
  async function loadMyBookings() {
    if (!token) return;
    const result = await api<Booking[]>("/bookings/mine", {}, token); setBookings(result);
  }
  async function cancelBooking(id: string) {
    setBusy(true); setError(""); setMessage("");
    try { await api<Booking>(`/bookings/${id}/cancel`, { method: "PATCH" }, token); await loadMyBookings(); setMessage("Reservation cancelled."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to cancel booking."); }
    finally { setBusy(false); }
  }
  async function downloadInvoice(id: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/bookings/${id}/invoice`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Unable to download invoice.");
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `staypilot-invoice-${id}.pdf`; anchor.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err instanceof Error ? err.message : "Invoice download failed."); }
  }
  async function loadAvailableRooms() {
    if (!nights) throw new Error("Check-out must be after check-in.");
    const query = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
    const result = await api<{ rooms: Room[]; count: number }>(`/rooms/availability?${query.toString()}`);
    setRooms(result.rooms); setSearched(true); return result.count;
  }
  async function searchRooms(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setSearched(false);
    try { const count = await loadAvailableRooms(); setMessage(`${count} available room(s) found for ${nights} night(s).`); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to search rooms."); }
    finally { setBusy(false); }
  }
  async function bookRoom(roomId: string) {
    if (!token) { setError("Please sign in before booking a room."); document.getElementById("account")?.scrollIntoView({ behavior: "smooth" }); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const booking = await api<{ bookingReference: string; totalPrice: number }>("/bookings", { method: "POST", body: JSON.stringify({ roomId, checkIn, checkOut, guests }) }, token);
      setMessage(`Reservation confirmed! Reference: ${booking.bookingReference}. Total: ₹${booking.totalPrice.toLocaleString("en-IN")}.`);
      await loadAvailableRooms();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to complete booking."); }
    finally { setBusy(false); }
  }
  function logout() {
    localStorage.removeItem("staypilot_token"); setToken(""); setUser(null); setShowDashboard(false); setMessage("You have been signed out.");
  }
  const goToAccount = () => { setMobileMenu(false); document.getElementById("account")?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#182b35]">
      <header className="absolute inset-x-0 top-0 z-30 border-b border-white/20 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <a href="#" className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full border border-[#d9c7a0]/60 text-[#e5d3a8]"><BedDouble size={22}/></span><span><span className="block font-serif text-2xl tracking-wide">StayPilot</span><span className="block text-[9px] uppercase tracking-[.28em] text-white/65">A better way to stay</span></span></a>
          <nav className="hidden items-center gap-8 text-xs uppercase tracking-[.16em] text-white/85 md:flex"><a href="#rooms" className="transition hover:text-[#e5d3a8]">Rooms & Suites</a><a href="#experience" className="transition hover:text-[#e5d3a8]">The Experience</a><a href="#amenities" className="transition hover:text-[#e5d3a8]">Amenities</a><a href="#account" className="transition hover:text-[#e5d3a8]">Contact</a></nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? <><button onClick={() => setShowDashboard(v => !v)} className="rounded-full border border-white/45 px-4 py-2 text-xs uppercase tracking-wider hover:bg-white/10">Dashboard</button><span className="text-xs text-white/80">{user.name}</span><button onClick={logout} aria-label="Sign out" className="rounded-full border border-white/40 p-2 hover:bg-white/10"><LogOut size={15}/></button></> : <button onClick={goToAccount} className="bg-[#d9c7a0] px-5 py-3 text-[11px] font-semibold uppercase tracking-[.16em] text-[#182b35] transition hover:bg-white">Sign in</button>}
          </div>
          <button className="md:hidden" onClick={() => setMobileMenu(v => !v)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
        </div>
        {mobileMenu && <div className="space-y-4 bg-[#172d38] px-6 py-5 text-sm md:hidden"><a className="block" href="#rooms" onClick={() => setMobileMenu(false)}>Rooms & Suites</a><a className="block" href="#experience" onClick={() => setMobileMenu(false)}>The Experience</a><a className="block" href="#amenities" onClick={() => setMobileMenu(false)}>Amenities</a><button onClick={goToAccount}>Sign in / Account</button></div>}
      </header>

      <section className="relative flex min-h-[690px] items-center bg-[#172d38] pt-24 text-white">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(90deg,rgba(10,25,34,.78) 0%,rgba(10,25,34,.43) 48%,rgba(10,25,34,.12) 100%),url('https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2200&q=90')" }}/>
        <div className="relative mx-auto w-full max-w-7xl px-5 pb-36 pt-24 lg:px-8">
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[.34em] text-[#e7d5ad]">Stay a little longer. Live a little better.</p>
          <h1 className="max-w-3xl font-serif text-5xl leading-[1.08] sm:text-7xl lg:text-[88px]">Your perfect stay<br/><span className="italic text-[#e8d5ad]">starts here.</span></h1>
          <p className="mt-7 max-w-lg text-sm leading-7 text-white/80 sm:text-base">A thoughtful hotel experience, made effortless. Find your room, make time for yourself, and let every detail feel just right.</p>
          <a href="#rooms" className="mt-9 inline-flex items-center gap-3 border border-white/65 px-6 py-4 text-[10px] font-semibold uppercase tracking-[.2em] transition hover:bg-white hover:text-[#172d38]">Explore the stay <ArrowRight size={15}/></a>
        </div>
        <form onSubmit={searchRooms} className="absolute inset-x-5 bottom-0 z-10 mx-auto grid max-w-6xl translate-y-1/2 gap-px bg-[#d8c7a2] p-px shadow-2xl shadow-black/20 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_.8fr_1.1fr]">
          <label className="bg-white px-6 py-5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#63717a]">Check in<input required min={todayString()} type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="mt-2 block w-full bg-transparent text-sm font-medium tracking-normal text-[#182b35] outline-none"/></label>
          <label className="bg-white px-6 py-5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#63717a]">Check out<input required min={checkIn} type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="mt-2 block w-full bg-transparent text-sm font-medium tracking-normal text-[#182b35] outline-none"/></label>
          <label className="bg-white px-6 py-5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#63717a]">Guests<select value={guests} onChange={e => setGuests(Number(e.target.value))} className="mt-2 block w-full bg-transparent text-sm font-medium tracking-normal text-[#182b35] outline-none">{Array.from({length:20},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} guest{n>1?"s":""}</option>)}</select></label>
          <button disabled={busy} className="flex items-center justify-center gap-3 bg-[#c3a875] px-7 py-5 text-[11px] font-bold uppercase tracking-[.18em] text-[#172d38] transition hover:bg-[#d8c7a2] disabled:opacity-60"><Search size={17}/>{busy?"Searching…":"Check availability"}</button>
        </form>
      </section>

      <section id="experience" className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-36 lg:grid-cols-2 lg:items-center lg:px-8 lg:pt-44">
        <div className="relative min-h-[420px]"><img className="absolute left-0 top-0 h-[350px] w-[75%] object-cover" src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=85" alt="Elegant hotel pool and resort"/><img className="absolute bottom-0 right-0 h-[205px] w-[54%] border-[10px] border-[#f7f5f0] object-cover" src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=85" alt="Warm and welcoming guest room"/></div>
        <div className="lg:pl-10"><p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#a58b5c]">Welcome to StayPilot</p><h2 className="mt-5 max-w-xl font-serif text-4xl leading-tight text-[#18313c] sm:text-5xl">Comfort meets<br/><em className="font-normal">considered living.</em></h2><p className="mt-6 max-w-xl text-sm leading-7 text-[#6c777b]">From the moment you arrive, discover a calmer kind of hospitality. Beautiful spaces, warm service and the little comforts that turn a trip into a memorable stay.</p><div className="mt-8 grid grid-cols-2 gap-5 border-t border-[#ddd7cb] pt-6"><div><p className="font-serif text-3xl text-[#b49a6a]">01</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-[.16em]">Easy reservations</p></div><div><p className="font-serif text-3xl text-[#b49a6a]">24/7</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-[.16em]">Here when you need us</p></div></div></div>
      </section>

      <section id="rooms" className="bg-[#eeeae1] px-5 py-20 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-10 flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#a58b5c]">Find your place</p><h2 className="mt-3 font-serif text-4xl text-[#18313c] sm:text-5xl">Rooms & suites</h2></div><p className="max-w-sm text-sm leading-6 text-[#6c777b]">Spaces designed to help you slow down, recharge and feel at home.</p></div>
        <div className="grid gap-6 md:grid-cols-3">{roomShowcase.map((room,i)=><article key={room.title} className="group bg-white"><div className="relative h-64 overflow-hidden"><img src={room.image} alt={room.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/><span className="absolute left-4 top-4 bg-white/90 px-3 py-2 text-[9px] font-bold tracking-[.18em] text-[#344952]">{room.tag}</span></div><div className="p-6"><div className="flex items-start justify-between gap-3"><h3 className="font-serif text-2xl text-[#18313c]">{room.title}</h3><Heart size={17} className="mt-1 text-[#a58b5c]"/></div><p className="mt-2 text-sm text-[#7a8588]">{room.detail}</p><div className="mt-6 flex items-center justify-between border-t border-[#ece8df] pt-4"><span className="text-xs font-semibold text-[#a58b5c]">{room.price}</span><a href="#availability" onClick={e=>{e.preventDefault();document.querySelector("form")?.scrollIntoView({behavior:"smooth",block:"center"});}} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#18313c]">Explore <ArrowRight size={14}/></a></div></div></article>)}</div>
      </div></section>

      <section id="amenities" className="relative overflow-hidden bg-[#18313c] text-white"><div className="absolute inset-0 bg-cover bg-center opacity-25" style={{backgroundImage:"url('https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?auto=format&fit=crop&w=1800&q=80')"}}/><div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center lg:px-8"><div><p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#ddc99e]">Made for your comfort</p><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">The little things<br/><em className="font-normal text-[#ddc99e]">make the stay.</em></h2><p className="mt-5 max-w-md text-sm leading-7 text-white/65">Whether you're here to work, unwind or explore, enjoy thoughtful amenities that make every day easier.</p></div><div className="grid grid-cols-2 gap-7">{[{icon:Wifi,label:"Complimentary Wi-Fi"},{icon:Coffee,label:"Breakfast & coffee"},{icon:Dumbbell,label:"Fitness space"},{icon:ShieldCheck,label:"Secure reservations"}].map(({icon:Icon,label})=><div key={label} className="border-t border-white/20 pt-5"><Icon className="text-[#ddc99e]" size={23}/><p className="mt-4 text-xs uppercase tracking-[.13em] text-white/85">{label}</p></div>)}</div></div></section>

      {(message || error) && <div role="status" className={`mx-auto max-w-7xl px-5 pt-8 lg:px-8 `}><div className={`border px-5 py-4 text-sm ${error?"border-rose-300 bg-rose-50 text-rose-800":"border-emerald-300 bg-emerald-50 text-emerald-900"}`}>{error||message}</div></div>}
      {showDashboard && user && <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8"><div className="border border-[#ddd7cb] bg-white p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[.2em] text-[#a58b5c]">ACCOUNT OVERVIEW</p><h2 className="mt-2 font-serif text-3xl">{user.role==="admin"?"Admin dashboard":"My bookings"}</h2></div><span className="border border-[#ddd7cb] px-3 py-1 text-xs capitalize">{user.role}</span></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="bg-[#f7f5f0] p-4"><p className="text-xs text-[#7a8588]">My reservations</p><p className="mt-2 text-2xl">{bookings.length}</p></div><div className="bg-[#f7f5f0] p-4"><p className="text-xs text-[#7a8588]">Active reservations</p><p className="mt-2 text-2xl">{bookings.filter(b=>b.status==="confirmed").length}</p></div><div className="bg-[#f7f5f0] p-4"><p className="text-xs text-[#7a8588]">Account role</p><p className="mt-2 text-2xl capitalize">{user.role}</p></div></div><div className="mt-7"><h3 className="font-serif text-xl">Reservation history</h3><div className="mt-3 space-y-3">{bookings.length?bookings.map(b=><article key={b._id} className="flex flex-wrap items-center justify-between gap-4 border border-[#e8e3d9] p-4"><div><p className="font-medium">{b.bookingReference} · Room {b.room?.roomNumber??"—"}</p><p className="mt-1 text-xs text-[#7a8588]">{new Date(b.checkIn).toLocaleDateString()} – {new Date(b.checkOut).toLocaleDateString()} · ₹{b.totalPrice.toLocaleString("en-IN")}</p><p className="mt-1 text-xs capitalize text-[#7a8588]">{b.status}</p></div><div className="flex gap-2"><button onClick={()=>void downloadInvoice(b._id)} className="border border-[#ddd7cb] px-3 py-2 text-xs">Invoice</button>{b.status==="confirmed"&&<button disabled={busy} onClick={()=>void cancelBooking(b._id)} className="border border-rose-200 px-3 py-2 text-xs text-rose-700">Cancel</button>}</div></article>):<p className="bg-[#f7f5f0] p-5 text-sm text-[#7a8588]">No reservations yet.</p>}</div></div></div></section>}

      {searched && <section id="availability" className="mx-auto max-w-7xl px-5 py-14 lg:px-8"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#a58b5c]">Your search results</p><h2 className="mt-2 font-serif text-4xl text-[#18313c]">Available rooms</h2></div><span className="text-sm text-[#7a8588]">{rooms.length} room(s) · {nights} night(s)</span></div>{rooms.length?<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{rooms.map(room=><article key={room._id} className="border border-[#e4dfd5] bg-white p-6"><div className="flex items-center justify-between"><BedDouble className="text-[#a58b5c]"/><span className="text-[10px] uppercase tracking-widest text-[#7a8588]">{room.type}</span></div><h3 className="mt-5 font-serif text-2xl">Room {room.roomNumber}</h3><p className="mt-1 text-sm text-[#7a8588]">Up to {room.capacity} guests</p><p className="mt-5 text-2xl text-[#18313c]">₹{room.pricePerNight.toLocaleString("en-IN")}<span className="text-xs text-[#7a8588]"> / night</span></p><p className="mt-1 text-xs text-[#7a8588]">₹{(room.pricePerNight*nights).toLocaleString("en-IN")} total</p><button disabled={busy} onClick={()=>void bookRoom(room._id)} className="mt-5 w-full bg-[#18313c] px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#284b59] disabled:opacity-60">Reserve this room</button></article>)}</div>:<p className="border border-[#e4dfd5] bg-white p-8 text-center text-sm text-[#7a8588]">No rooms are available for those dates. Please try another date or guest count.</p>}</section>}

      <section id="account" className="bg-[#eeeae1] px-5 py-20 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.9fr_1.1fr]"><div><p className="text-[10px] font-bold uppercase tracking-[.28em] text-[#a58b5c]">Your StayPilot account</p><h2 className="mt-4 max-w-md font-serif text-4xl leading-tight text-[#18313c] sm:text-5xl">A smoother stay starts with a hello.</h2><p className="mt-5 max-w-md text-sm leading-7 text-[#6c777b]">Sign in or create an account to reserve your room. Your booking details stay connected to your account, so planning is simple.</p>{user&&<div className="mt-6 flex items-center gap-3 border border-[#d9d2c5] bg-white p-4"><UserRound className="text-[#a58b5c]"/><div><p className="font-medium">{user.name}</p><p className="text-xs text-[#7a8588]">{user.email}</p></div></div>}</div>
        {!user?<form onSubmit={submitAuth} className="bg-white p-6 shadow-sm sm:p-9"><div className="mb-6 flex gap-5 border-b border-[#e8e3d9]"><button type="button" onClick={()=>setAuthMode("login")} className={`pb-3 text-xs font-bold uppercase tracking-widest ${authMode==="login"?"border-b-2 border-[#b49a6a] text-[#18313c]":"text-[#9aa1a1]"}`}>Sign in</button><button type="button" onClick={()=>setAuthMode("register")} className={`pb-3 text-xs font-bold uppercase tracking-widest ${authMode==="register"?"border-b-2 border-[#b49a6a] text-[#18313c]":"text-[#9aa1a1]"}`}>Create account</button></div>{authMode==="register"&&<label className="mb-4 block text-xs font-semibold uppercase tracking-wider text-[#63717a]">Full name<input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} className="mt-2 block w-full border border-[#ddd7cb] bg-[#fbfaf7] px-4 py-3 text-sm normal-case tracking-normal text-[#182b35] outline-none focus:border-[#b49a6a]"/></label>}<label className="mb-4 block text-xs font-semibold uppercase tracking-wider text-[#63717a]">Email<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block w-full border border-[#ddd7cb] bg-[#fbfaf7] px-4 py-3 text-sm normal-case tracking-normal text-[#182b35] outline-none focus:border-[#b49a6a]"/></label><label className="block text-xs font-semibold uppercase tracking-wider text-[#63717a]">Password<input required type="password" minLength={authMode==="register"?8:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block w-full border border-[#ddd7cb] bg-[#fbfaf7] px-4 py-3 text-sm normal-case tracking-normal text-[#182b35] outline-none focus:border-[#b49a6a]"/></label><button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 bg-[#18313c] px-5 py-4 text-xs font-bold uppercase tracking-[.18em] text-white transition hover:bg-[#284b59] disabled:opacity-60"><LogIn size={16}/>{busy?"Please wait…":authMode==="login"?"Sign in to your account":"Create your account"}</button></form>:<div className="flex flex-col justify-center bg-white p-8"><div className="flex size-12 items-center justify-center rounded-full bg-[#e8efe9] text-[#46745b]"><Check size={22}/></div><h3 className="mt-5 font-serif text-2xl text-[#18313c]">You're signed in.</h3><p className="mt-2 text-sm leading-6 text-[#7a8588]">Search for a room above and reserve your next stay. Your account is ready whenever you are.</p><button onClick={logout} className="mt-6 flex items-center gap-2 self-start border border-[#ddd7cb] px-4 py-3 text-xs font-bold uppercase tracking-widest"><LogOut size={14}/> Sign out</button></div>}</div></section>
      <footer className="bg-[#122832] px-5 py-10 text-white lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-7 sm:flex-row sm:items-center"><div><span className="font-serif text-3xl">StayPilot</span><p className="mt-2 text-[10px] uppercase tracking-[.2em] text-white/50">A better way to stay</p></div><div className="flex flex-wrap gap-6 text-[10px] uppercase tracking-[.16em] text-white/65"><a href="#rooms" className="hover:text-white">Rooms</a><a href="#amenities" className="hover:text-white">Amenities</a><a href="#account" className="hover:text-white">Account</a></div><p className="text-xs text-white/45">© {new Date().getFullYear()} StayPilot · Hotel reservations</p></div></footer>
    </main>
  );
}
export default App;
