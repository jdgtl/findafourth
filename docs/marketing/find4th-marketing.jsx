import { useState, useEffect, useRef } from "react";
import {
  Smartphone, Zap, ClipboardList, Calendar, MapPin, BarChart3,
  Bell, Users, Heart, User, Home, Target, Handshake, Building2, Timer,
  Lightbulb, Snowflake, ArrowRight, ChevronDown, Plus, Check, MoreHorizontal,
  Clock, UserCheck, Menu, X, Quote, CircleOff, Phone, Mail, MessageCircle,
  Star, AlertTriangle
} from "lucide-react";

const colors = {
  night: "#0a0f1a", deepBlue: "#0d1b2a", slate: "#1b2838",
  warm: "#f5e6c8", warmMuted: "#c4a97d", frost: "#d1e3f8",
  emerald: "#34d399", emeraldDark: "#059669", amber: "#f59e0b", wire: "#4a5568",
};
const serif = "'DM Serif Display', Georgia, serif";
const sans = "'DM Sans', sans-serif";

function WireMeshBg() {
  return (<svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg"><defs><pattern id="wire" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 12h24M12 0v24" stroke="#d1e3f8" strokeWidth="0.5" fill="none"/></pattern></defs><rect width="100%" height="100%" fill="url(#wire)"/></svg>);
}
function GlowOrb({ className = "", color = "#34d399" }) {
  return (<div className={`absolute rounded-full pointer-events-none ${className}`} style={{ background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`, filter: "blur(60px)" }} />);
}

// ─── NAV ─────────────────────────────────────────────
function NavBar({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { const h = () => setScrolled(window.scrollY > 40); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);
  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMobileOpen(false); };
  const links = [["How It Works", "how"], ["Features", "features"], ["FAQ", "faq"]];
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500" style={{ background: scrolled ? "rgba(10,15,26,0.95)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid rgba(52,211,153,0.1)" : "none" }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}><span className="text-white font-black text-sm">4</span></div>
          <span className="text-xl tracking-tight" style={{ fontFamily: serif, color: colors.warm }}>Find4th</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {links.map(([label, id]) => (<button key={id} onClick={() => scrollTo(id)} className="text-sm tracking-wide transition-colors hover:text-emerald-400" style={{ color: colors.warmMuted, fontFamily: sans }}>{label}</button>))}
          <button onClick={onGetStarted} className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #34d399, #059669)", color: colors.night }}>Get Started</button>
        </div>
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={24} className="text-emerald-400" /> : <Menu size={24} className="text-emerald-400" />}</button>
      </div>
      {mobileOpen && (<div className="md:hidden px-6 pb-6 space-y-4" style={{ background: "rgba(10,15,26,0.98)" }}>{links.map(([label, id]) => (<button key={id} onClick={() => scrollTo(id)} className="block text-base w-full text-left py-2" style={{ color: colors.warm }}>{label}</button>))}<button onClick={() => { onGetStarted(); setMobileOpen(false); }} className="w-full py-3 rounded-full text-sm font-semibold" style={{ background: "linear-gradient(135deg, #34d399, #059669)", color: colors.night }}>Get Started</button></div>)}
    </nav>
  );
}

// ─── HERO ────────────────────────────────────────────
function Hero({ onGetStarted }) {
  const particles = useRef([...Array(20)].map(() => ({ w: Math.random()*3+1, left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, dur: `${3+Math.random()*4}s`, delay: `${Math.random()*3}s` }))).current;
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: `linear-gradient(170deg, ${colors.night} 0%, ${colors.deepBlue} 50%, ${colors.slate} 100%)` }}>
      <WireMeshBg /><GlowOrb className="w-96 h-96 -top-40 -right-40" color="#34d399" /><GlowOrb className="w-64 h-64 bottom-20 -left-40" color="#f59e0b" />
      {particles.map((p, i) => (<div key={i} className="absolute rounded-full pointer-events-none" style={{ width: p.w, height: p.w, background: "rgba(209,227,248,0.3)", left: p.left, top: p.top, animation: `float ${p.dur} ease-in-out infinite`, animationDelay: p.delay }} />))}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-20 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h1 className="text-5xl md:text-7xl leading-tight mb-6" style={{ fontFamily: serif, color: colors.warm, lineHeight: 1.05 }}>
            Texts. Calls.<br />Emails. Crickets.
            <span className="block mt-2" style={{ background: "linear-gradient(135deg, #34d399, #6ee7b7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>There's a better way.</span>
          </h1>
          <p className="text-lg leading-relaxed mb-10 max-w-lg" style={{ color: colors.warmMuted, fontFamily: sans }}>One request. The right players notified. Spots filled and confirmed — before you've even laced up your shoes.</p>
          <div className="flex flex-wrap gap-4">
            <button onClick={onGetStarted} className="group px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #34d399, #059669)", color: colors.night }}>Start Finding Players <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" /></button>
            <button onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })} className="px-8 py-4 rounded-full text-lg transition-all hover:bg-white/5" style={{ color: colors.frost, border: "1px solid rgba(209,227,248,0.2)" }}>See How It Works</button>
          </div>
        </div>
        {/* Phone mockup */}
        <div className="relative hidden lg:flex justify-center">
          <div className="relative">
            <div className="w-72 rounded-3xl p-3 shadow-2xl" style={{ background: "linear-gradient(160deg, #1f2937, #111827)", boxShadow: "0 0 80px rgba(52,211,153,0.15), 0 30px 60px rgba(0,0,0,0.5)" }}>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />
              <div className="rounded-3xl overflow-hidden" style={{ background: "#f8fafc" }}>
                <div className="px-6 pt-10 pb-3 flex justify-between items-center text-xs font-medium" style={{ background: "linear-gradient(135deg, #059669, #047857)", color: "white" }}>
                  <span>9:41</span><span style={{ fontFamily: serif, fontSize: 14 }}>Find4th</span><MoreHorizontal size={14} />
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between mb-1"><span className="text-sm font-bold text-gray-900">Open Games</span><span className="text-xs text-emerald-600 font-medium">3 near you</span></div>
                  {[{ time: "Tonight, 7:00 PM", club: "Cape Ann PT", spots: 1, pti: "35-45" },{ time: "Tomorrow, 6:30 PM", club: "Wellesley CC", spots: 2, pti: null },{ time: "Sat, 10:00 AM", club: "Needham PTC", spots: 1, pti: "25-40" }].map((req,i)=>(
                    <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm" style={{ animation: `slideUp 0.5s ease ${0.2+i*0.15}s both` }}>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-800"><Clock size={12} className="text-emerald-600" />{req.time}</div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1"><MapPin size={12} />{req.club}</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full" style={{ fontSize: 10 }}>Need {req.spots}</span>
                          {req.pti && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full" style={{ fontSize: 10 }}>PTI {req.pti}</span>}
                        </div>
                        <button className="font-bold text-white px-3 py-1 rounded-full" style={{ background: "#059669", fontSize: 10 }}>I'm In</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-around py-3 border-t border-gray-100 mt-2">
                  <Home size={16} className="text-gray-900" /><Users size={16} className="text-gray-300" /><Target size={16} className="text-gray-300" /><Heart size={16} className="text-gray-300" /><User size={16} className="text-gray-300" />
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-8 bg-white rounded-2xl p-3 shadow-xl border border-gray-100 w-56" style={{ animation: "floatIn 0.8s ease 1s both" }}>
              <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">4</div><div><div className="text-xs font-semibold text-gray-900">Mike T. needs 1 more</div><div className="text-gray-500" style={{ fontSize: 10 }}>Cape Ann PT · Tonight 7 PM</div></div></div>
            </div>
            <div className="absolute -bottom-6 -left-12 bg-emerald-600 text-white rounded-2xl px-4 py-2.5 shadow-xl" style={{ animation: "floatIn 0.8s ease 1.5s both" }}>
              <div className="flex items-center gap-2"><Check size={18} /><div><div className="text-xs font-semibold">You're confirmed!</div><div style={{ fontSize: 10, opacity: 0.8 }}>See you at 7 PM</div></div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs tracking-widest uppercase" style={{ color: colors.warmMuted }}>Scroll</span>
        <div className="w-6 h-10 rounded-full border-2 flex items-start justify-center p-1.5" style={{ borderColor: "rgba(196,169,125,0.3)" }}><ChevronDown size={14} className="text-emerald-400 animate-bounce" /></div>
      </div>
    </section>
  );
}

// ─── THE PROBLEM (Without / With) ───────────────────
function ProblemSection() {
  const without = [
    { icon: MessageCircle, text: "You fire off texts to six people. Two 'maybes,' one 'what time again?,' three ghosts." },
    { icon: Mail, text: "You send an email to the club list. It lands in spam. Or gets buried under reply-alls." },
    { icon: Phone, text: "You start calling around. Voicemail. Voicemail. 'Let me check with my wife.'" },
    { icon: AlertTriangle, text: "Now four people said yes — but you only need one. Awkward." },
    { icon: Clock, text: "An hour gone. You're still managing a spreadsheet in your head instead of playing paddle." },
  ];
  const withApp = [
    "Post your game with one tap",
    "The right players get notified instantly",
    "First to respond locks the spot",
    "Everyone knows who's in, who's out",
    "Show up and play",
  ];

  return (
    <section className="relative py-24 overflow-hidden" style={{ background: `linear-gradient(180deg, ${colors.slate}, ${colors.deepBlue})` }}>
      <WireMeshBg />
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block text-xs tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full" style={{ color: colors.amber, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontFamily: sans }}>The Problem</span>
          <h2 className="text-3xl md:text-5xl mb-4" style={{ fontFamily: serif, color: colors.warm }}>Filling a game shouldn't<br /><span style={{ color: colors.amber }}>be a part-time job.</span></h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Without */}
          <div className="rounded-2xl p-8" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                <Smartphone size={20} style={{ color: colors.amber }} />
              </div>
              <h3 className="text-xl font-semibold" style={{ fontFamily: serif, color: colors.amber }}>Without Find4th</h3>
            </div>
            <div className="space-y-4">
              {without.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="flex items-start gap-3" style={{ animation: `slideInLeft 0.5s ease ${i * 0.08}s both` }}>
                    <Icon size={18} className="flex-shrink-0 mt-0.5" style={{ color: colors.amber }} />
                    <p className="text-sm leading-relaxed" style={{ color: colors.warmMuted, fontFamily: sans }}>{step.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
          {/* With */}
          <div className="rounded-2xl p-8" style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.15)" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(52,211,153,0.15)" }}>
                <Zap size={20} style={{ color: colors.emerald }} />
              </div>
              <h3 className="text-xl font-semibold" style={{ fontFamily: serif, color: colors.emerald }}>With Find4th</h3>
            </div>
            <div className="space-y-4">
              {withApp.map((step, i) => (
                <div key={i} className="flex items-center gap-3" style={{ animation: `slideUp 0.5s ease ${i * 0.08}s both` }}>
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: colors.emerald, color: colors.night }}>{i + 1}</div>
                  <span className="text-sm" style={{ color: colors.warm, fontFamily: sans }}>{step}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 flex items-center gap-2" style={{ borderTop: "1px solid rgba(52,211,153,0.15)" }}>
              <Timer size={16} style={{ color: colors.emerald }} />
              <span className="text-sm font-medium" style={{ color: colors.emerald, fontFamily: sans }}>One place. One tap. Done.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ───────────────────────────────────
function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const tabs = [
    { label: "Post Match", icon: ClipboardList },
    { label: "Players Notified", icon: Bell },
    { label: "Spot Filled", icon: Check },
  ];
  const steps = [
    {
      title: "Create Player Request",
      desc: "Pick your club, choose a time, set how many players you need — and if you want, dial in a PTI range so you're matched with the right skill level. Takes about ten seconds.",
      detail: "Use Quick Fill to let the first responders lock in automatically, or Organizer Picks to hand-select your lineup.",
      visual: (
        <div className="bg-white rounded-2xl p-5 shadow-lg max-w-xs mx-auto">
          <div className="text-sm font-bold text-gray-900 mb-4">New Request</div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5 text-sm text-gray-700"><Calendar size={14} className="text-gray-400" /> Tonight, 7:00 PM</div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5 text-sm text-gray-700"><MapPin size={14} className="text-gray-400" /> Cape Ann Paddle Tennis</div>
            <div className="flex gap-2">{[1,2,3].map(n=>(<button key={n} className={`flex-1 py-2 rounded-lg text-sm font-medium ${n===1?"bg-emerald-600 text-white":"bg-gray-100 text-gray-500"}`}>Need {n}</button>))}</div>
            <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-2.5 text-sm text-emerald-700"><BarChart3 size={14} /> PTI Range: 30 – 45</div>
          </div>
        </div>
      ),
    },
    {
      title: "Players Get Notified",
      desc: "Your request goes out instantly to your crews, your club, or both. Players get notified the way they prefer — push, email, or text. No chasing anyone down.",
      detail: "Only the people you want to reach see it. No spam, no noise.",
      visual: (
        <div className="space-y-3 max-w-xs mx-auto">
          {[{ name: "Wednesday Night Crew", count: "6 players", type: "Crew" },{ name: "Cape Ann Paddle Tennis", count: "42 players", type: "Club" }].map((a,i)=>(
            <div key={i} className="bg-white rounded-xl p-4 shadow-lg flex items-center justify-between" style={{ animation: `slideUp 0.5s ease ${i*0.15}s both` }}>
              <div><div className="text-sm font-semibold text-gray-900">{a.name}</div><div className="text-xs text-gray-500">{a.count}</div></div>
              <span className="font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700" style={{ fontSize: 10 }}>{a.type}</span>
            </div>
          ))}
          <div className="bg-white rounded-xl p-4 shadow-lg" style={{ animation: "slideUp 0.5s ease 0.3s both" }}>
            <div className="text-xs font-medium text-gray-500 mb-2">Notified via</div>
            <div className="flex gap-2">
              {[{ icon: Bell, label: "Push" },{ icon: Mail, label: "Email" },{ icon: MessageCircle, label: "SMS" }].map((ch,i) => {
                const I = ch.icon;
                return (<div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5"><I size={12} className="text-emerald-600" /><span className="text-xs text-gray-700">{ch.label}</span></div>);
              })}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Spot Gets Filled",
      desc: "Players tap 'I'm In' and the spot is locked. Everyone sees the confirmed lineup in real time. No back-and-forth, no double-booking, no guesswork.",
      detail: "You'll know exactly who's playing before you leave the house.",
      visual: (
        <div className="bg-white rounded-2xl p-5 shadow-lg max-w-xs mx-auto">
          <div className="text-sm font-bold text-gray-900 mb-1">Tonight at 7:00 PM</div>
          <div className="text-xs text-gray-500 mb-4">Cape Ann Paddle Tennis</div>
          <div className="space-y-2">
            {["You (Organizer)","Mark T.","Sarah L.","Dave K."].map((name,i)=>(
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "#ecfdf5" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-emerald-500"><Check size={14}/></div>
                <span className="text-sm text-emerald-800 font-medium">{name}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Game Full — See You There</div>
        </div>
      ),
    },
  ];

  return (
    <section id="how" className="relative py-24" style={{ background: colors.night }}>
      <WireMeshBg /><GlowOrb className="w-80 h-80 top-0 right-0" color="#34d399" />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block text-xs tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full" style={{ color: colors.emerald, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", fontFamily: sans }}>How It Works</span>
          <h2 className="text-3xl md:text-5xl" style={{ fontFamily: serif, color: colors.warm }}>Fill your game<br /><span style={{ color: colors.emerald }}>without the runaround.</span></h2>
        </div>
        <div className="flex justify-center gap-4 mb-12">
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            return (
              <button key={i} onClick={() => setActiveStep(i)} className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all" style={{
                background: activeStep===i?"rgba(52,211,153,0.15)":"rgba(255,255,255,0.03)",
                border: activeStep===i?"1px solid rgba(52,211,153,0.4)":"1px solid rgba(255,255,255,0.08)",
                color: activeStep===i?colors.emerald:colors.warmMuted, fontFamily: sans,
              }}>
                <Icon size={20} /><span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: "rgba(52,211,153,0.15)", color: colors.emerald }}>{activeStep+1}</div>
              <h3 className="text-2xl" style={{ fontFamily: serif, color: colors.warm }}>{steps[activeStep].title}</h3>
            </div>
            <p className="text-lg leading-relaxed mb-4" style={{ color: colors.warmMuted, fontFamily: sans }}>{steps[activeStep].desc}</p>
            <p className="text-sm p-4 rounded-xl flex items-start gap-2" style={{ color: colors.frost, background: "rgba(209,227,248,0.05)", border: "1px solid rgba(209,227,248,0.1)", fontFamily: sans }}>
              <Lightbulb size={16} className="flex-shrink-0 mt-0.5" style={{ color: colors.amber }} />{steps[activeStep].detail}
            </p>
          </div>
          <div className="flex justify-center">{steps[activeStep].visual}</div>
        </div>
      </div>
    </section>
  );
}

// ─── FEATURES ───────────────────────────────────────
function Features() {
  const features = [
    { icon: BarChart3, title: "PTI Integration", desc: "Your Platform Tennis Index syncs automatically from APTA league standings — no manual entry needed. Set a PTI range on any request to ensure competitive matches. Track your rating trend over time and see how you stack up against your usual partners.", tag: "Core", highlight: true },
    { icon: Users, title: "Crews & Favorites", desc: "Build crews for your regular groups — Tuesday Night Crew, Weekend Warriors, whatever works. Star individual players as favorites for quick access. Target your requests to exactly the right people.", tag: "Social" },
    { icon: Bell, title: "Multi-Channel Notifications", desc: "Push, email, and SMS — each player picks how they want to be reached. Nobody misses a game because they didn't check their email.", tag: "Instant" },
    { icon: Handshake, title: "Partner Chemistry", desc: "See your win/loss record with every partner you've played with. Find out who you're actually good with — backed by match data.", tag: "Analytics" },
    { icon: Building2, title: "Club Directory", desc: "Browse clubs with verified details. Set your home club, add clubs you visit, and discover games across the paddle community.", tag: "Discovery" },
    { icon: Smartphone, title: "Install Like an App", desc: "Add to your home screen and it works like a native app — no App Store needed. Fast, offline-capable, and always one tap away.", tag: "PWA" },
    { icon: Zap, title: "Quick Fill Mode", desc: "First come, first served. Spots fill automatically as players respond. No back-and-forth, no waiting on confirmations.", tag: "Speed" },
    { icon: UserCheck, title: "Availability Posts", desc: "Not organizing but free to play? Post that you're available and let organizers find you. Great for new members looking for games.", tag: "Flexible" },
  ];
  return (
    <section id="features" className="relative py-24" style={{ background: `linear-gradient(180deg, ${colors.deepBlue}, ${colors.night})` }}>
      <WireMeshBg />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block text-xs tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full" style={{ color: colors.frost, background: "rgba(209,227,248,0.05)", border: "1px solid rgba(209,227,248,0.1)", fontFamily: sans }}>Features</span>
          <h2 className="text-3xl md:text-5xl mb-4" style={{ fontFamily: serif, color: colors.warm }}>
            Built by paddle players,<br /><span style={{ color: colors.emerald }}>for paddle players.</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.warmMuted, fontFamily: sans }}>Every feature exists because we needed it ourselves.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => { const Icon = f.icon; return (
            <div key={i} className={`group p-6 rounded-2xl transition-all hover:scale-105 cursor-default ${f.highlight ? "md:col-span-2" : ""}`} style={{
              background: f.highlight ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.02)",
              border: f.highlight ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.06)",
            }}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(52,211,153,0.1)" }}><Icon size={20} style={{ color: colors.emerald }} /></div>
                <span className="font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full" style={{ color: colors.emerald, background: "rgba(52,211,153,0.1)", fontFamily: sans, fontSize: 10 }}>{f.tag}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: serif, color: colors.warm }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: colors.warmMuted, fontFamily: sans }}>{f.desc}</p>
            </div>
          ); })}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState(null);
  const faqs = [
    { q: "Is Find4th free?", a: "Yes, completely free. No subscriptions, no hidden fees, no premium tier. We built this because we needed it ourselves — it's a tool for the paddle community." },
    { q: "What is PTI and how does it work here?", a: "PTI (Platform Tennis Index) is the rating system used by the APTA. Find4th automatically syncs PTI ratings from league standings, so your profile always reflects your current rating. You can also enter or update your PTI manually. When creating a game request, you can set a PTI range to ensure competitive balance." },
    { q: "How do notifications work?", a: "You choose how you want to be notified: push notifications, email, SMS, or any combination. When someone posts a game that matches your club or crew, you get notified instantly. No more missing games because you didn't see the group text." },
    { q: "Do I need to download it from the App Store?", a: "No app store needed. Find4th is a Progressive Web App (PWA). Visit find4th.com on your phone, tap 'Add to Home Screen,' and it works just like a native app — with push notifications, offline support, and instant access from your home screen." },
    { q: "What are Crews and Favorites?", a: "Crews are groups of players you play with regularly — your Tuesday night group, weekend warriors, or mixed doubles squad. Favorites let you bookmark individual players for quick access. When you post a game, you can target it to specific crews so only the right people get notified, and your favorites are always easy to reach." },
    { q: "What's the difference between Quick Fill and Organizer Picks?", a: "Quick Fill is first-come-first-served — the first players to tap 'I'm In' are automatically confirmed. Organizer Picks lets you review who's interested and hand-pick your lineup. Use Quick Fill when you just need bodies, and Organizer Picks when skill balance or group dynamics matter." },
    { q: "What is Partner Chemistry?", a: "Partner Chemistry pulls your match history and shows your win/loss record with every partner you've played with. It helps you identify your strongest doubles pairings and see how your PTI has trended over the season. Think of it as analytics for your paddle game." },
    { q: "Can I use this for my club league?", a: "Absolutely. League coordinators use Crews to manage league teams, and the notification system ensures everyone knows when matches are scheduled. The PTI integration also helps with team balancing and competitive parity." },
    { q: "I'm new to paddle. Is this for me?", a: "Especially for you. Post an Availability to let organizers know you're looking for games. Set your skill level and the right players will find you. It's the fastest way to get connected at a new club." },
  ];
  return (
    <section id="faq" className="relative py-24" style={{ background: `linear-gradient(180deg, ${colors.night}, ${colors.deepBlue})` }}>
      <WireMeshBg />
      <div className="max-w-3xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block text-xs tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full" style={{ color: colors.frost, background: "rgba(209,227,248,0.05)", border: "1px solid rgba(209,227,248,0.1)", fontFamily: sans }}>FAQ</span>
          <h2 className="text-3xl md:text-5xl mb-4" style={{ fontFamily: serif, color: colors.warm }}>Got questions?</h2>
          <p className="text-lg" style={{ color: colors.warmMuted, fontFamily: sans }}>Everything you need to know before you start finding players.</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl overflow-hidden transition-all" style={{ background: open===i?"rgba(52,211,153,0.05)":"rgba(255,255,255,0.02)", border: open===i?"1px solid rgba(52,211,153,0.15)":"1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => setOpen(open===i?null:i)} className="w-full text-left px-6 py-5 flex items-center justify-between gap-4">
                <span className="text-base font-medium" style={{ color: colors.warm, fontFamily: sans }}>{faq.q}</span>
                <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform" style={{ background: "rgba(52,211,153,0.1)", color: colors.emerald, transform: open===i?"rotate(45deg)":"none" }}><Plus size={16} /></span>
              </button>
              {open===i && (<div className="px-6 pb-5"><p className="text-sm leading-relaxed" style={{ color: colors.warmMuted, fontFamily: sans }}>{faq.a}</p></div>)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FINAL CTA ──────────────────────────────────────
function FinalCTA({ onGetStarted }) {
  return (
    <section className="relative py-24 overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors.deepBlue}, #0a2e1f)` }}>
      <GlowOrb className="w-96 h-96 top-0 left-1/2 -translate-x-1/2 -translate-y-1/3" color="#34d399" /><WireMeshBg />
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <Target size={56} className="mx-auto mb-6" style={{ color: colors.emerald }} />
        <h2 className="text-3xl md:text-5xl mb-6" style={{ fontFamily: serif, color: colors.warm }}>Your next game is<span className="block" style={{ color: colors.emerald }}>one tap away.</span></h2>
        <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: colors.warmMuted, fontFamily: sans }}>No download required. Sign up, set your club, and start finding players.</p>
        <button onClick={onGetStarted} className="group px-10 py-5 rounded-full text-xl font-semibold transition-all hover:scale-105 inline-flex items-center gap-3" style={{ background: "linear-gradient(135deg, #34d399, #059669)", color: colors.night, boxShadow: "0 0 40px rgba(52,211,153,0.3)" }}>
          Get Started
          <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
        </button>
        <p className="text-sm mt-6" style={{ color: colors.warmMuted, fontFamily: sans }}>Takes 30 seconds. No app download needed.</p>
      </div>
    </section>
  );
}

// ─── FOOTER ─────────────────────────────────────────
function Footer() {
  const cols = [
    { title: "Product", links: ["How It Works","Features","FAQ"] },
    { title: "Community", links: ["Clubs","Partner Chemistry","PTI Ratings"] },
    { title: "Support", links: ["Contact Us","Privacy Policy","Terms of Service"] },
  ];
  return (
    <footer className="py-12" style={{ background: colors.night, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #34d399, #059669)" }}><span className="text-white font-black text-xs">4</span></div>
            <span className="text-lg" style={{ fontFamily: serif, color: colors.warm }}>Find4th</span>
          </div>
          <p className="text-sm leading-relaxed max-w-sm" style={{ color: colors.warmMuted, fontFamily: sans }}>Taking the hassle out of finding paddle players.</p>
        </div>
        <div className="flex justify-between mb-10">
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold mb-4 tracking-wide uppercase" style={{ color: colors.warm, fontFamily: sans }}>{col.title}</h4>
              <div className="space-y-2">
                {col.links.map(link => (<button key={link} className="block text-sm transition-colors hover:text-emerald-400" style={{ color: colors.warmMuted, fontFamily: sans }}>{link}</button>))}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs" style={{ color: colors.warmMuted, fontFamily: sans }}>© 2026 Find4th. All rights reserved.</p>
          <p className="text-xs flex items-center gap-1.5" style={{ color: "rgba(196,169,125,0.5)", fontFamily: sans }}>Made with <Snowflake size={12} /> for the paddle community</p>
        </div>
      </div>
    </footer>
  );
}

// ─── GLOBAL STYLES ──────────────────────────────────
function GlobalStyles() {
  return (<style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display&display=swap');
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes floatIn { from { opacity: 0; transform: translateY(20px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
    html { scroll-behavior: smooth; } body { margin: 0; padding: 0; background: #0a0f1a; } *, *::before, *::after { box-sizing: border-box; }
  `}</style>);
}

// ─── MAIN ───────────────────────────────────────────
export default function Find4thMarketing() {
  const handleGetStarted = () => window.open("https://find4th.com/signup", "_blank");
  return (
    <div style={{ fontFamily: sans }}>
      <GlobalStyles />
      <NavBar onGetStarted={handleGetStarted} />
      <Hero onGetStarted={handleGetStarted} />
      <ProblemSection />
      <HowItWorks />
      <Features />
      <FAQ />
      <FinalCTA onGetStarted={handleGetStarted} />
      <Footer />
    </div>
  );
}
