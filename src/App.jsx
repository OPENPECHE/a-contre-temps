import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth, AuthModal, MonCompte } from "./Auth.jsx";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const SB_URL = "https://jxxgafyqfbnqieiqltcn.supabase.co";
const SB_KEY = "sb_publishable_MdBMZ53hCDINWEu8jfsrzQ_sOeIuqZo";

async function sbFetch(path, opts = {}) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: "Bearer " + SB_KEY,
      "Content-Type": "application/json",
      Prefer: opts.method === "POST" ? "return=representation" : "",
      ...(opts.headers || {}),
    },
  });
  const t = await r.text();
  return t ? JSON.parse(t) : [];
}
import { Heart, ShoppingBag, MapPin, Mail, Phone, Plus, Minus, X, Menu, ArrowRight, Truck, User, ChevronLeft, ChevronRight, CreditCard, Banknote, Smartphone } from "lucide-react";

// ─── Zone de livraison : géolocalisation code postal (API gratuite data.gouv) ──
async function geocodePostal(cp) {
  if (!/^\d{5}$/.test(cp)) return null;
  try {
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${cp}&type=municipality&limit=1`);
    const j = await r.json();
    const f = j.features?.[0];
    if (!f) return null;
    const [lng, lat] = f.geometry.coordinates;
    return { lat, lng, city: f.properties.city, label: f.properties.label };
  } catch { return null; }
}
// Distance en km entre deux points (formule de Haversine)
function haversineKm(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const COLORS = {
  blueDeep: "#3E5A70",
  blue: "#7C97AC",
  blueSoft: "#D6DFE5",
  cream: "#F3E7DA",
  paper: "#FBF8F4",
  ink: "#2B2925",
  inkSoft: "rgba(43,41,37,0.62)",
  rust: "#A6713F",
};

const FONT_DISPLAY = "'Fraunces', serif";
const FONT_BODY = "'Outfit', sans-serif";

// Logo "à contre-temps" — images dans publique/ (servies à la racine du site)
function HeartMark({ size = 28, tone = "cream", className = "" }) {
  const src = tone === "rust" ? "/heart-rust.png" : "/heart-cream.png";
  return (
    <img src={src} alt="à contre-temps"
      style={{ display: "inline-block", height: `${size}px`, width: `${Math.round(size * 0.852)}px`, maxWidth: "none" }}
      className={className} />
  );
}

function PulseLine({ color = COLORS.rust, opacity = 1 }) {
  return (
    <svg viewBox="0 0 400 32" className="w-full h-6" preserveAspectRatio="none" style={{ opacity }}>
      <path
        d="M0,16 L150,16 L165,3 L178,29 L191,9 L202,16 L400,16"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Eyebrow({ children, color = COLORS.inkSoft }) {
  return (
    <p className="tracked text-[11px] flex items-center justify-center gap-3" style={{ color }}>
      <span style={{ width: 18, height: 1, backgroundColor: color, opacity: 0.5 }} />
      {children}
      <span style={{ width: 18, height: 1, backgroundColor: color, opacity: 0.5 }} />
    </p>
  );
}

function GrainOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "3px 3px",
        mixBlendMode: "overlay",
      }}
    />
  );
}

const PHOTOS = {
  hero:        "https://images.unsplash.com/photo-1568471173242-461f0a730452?w=1400&q=80",
  matin:       "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80",
  midi:        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
  soir:        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
  biscuiterie: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80",
};

// Métadonnées visuelles par catégorie — REPLI pour les 5 catégories historiques.
// La source de vérité est désormais la table delivery_rules (colonnes photo/label/
// title/subtitle/description), éditable depuis le back-office.
const CATEGORY_META = {
  "Petit-déjeuner entreprises": {
    photo: PHOTOS.matin,
    label: "Le matin",
    title: "Box petit-déjeuner",
    sub: "Pour les entreprises",
    text: "Viennoiseries du fournil, pains spéciaux, confitures de producteurs et jus pressés.",
  },
  "Traiteur midi": {
    photo: PHOTOS.midi,
    label: "Le midi",
    title: "Pain & traiteur léger",
    sub: "Pour les bureaux",
    text: "Sandwiches au levain, salades composées, pains à partager. Une pause déjeuner sans file d'attente.",
  },
  "Brunch & apéritif": {
    photo: PHOTOS.soir,
    label: "Soir & week-end",
    title: "Box apéritif",
    sub: "Pour recevoir",
    text: "Planches à composer, charcuterie, fromages et accompagnements de producteurs locaux.",
  },
  "Brunch week-end": {
    photo: PHOTOS.soir,
    label: "Week-end",
    title: "Box brunch",
    sub: "Pour recevoir",
    text: "Mini-viennoiseries sucrées-salées, confitures et accompagnements de producteurs locaux.",
  },
  "Biscuiterie (expédition)": {
    photo: PHOTOS.biscuiterie,
    label: "Expédiée partout en France",
    title: "La biscuiterie",
    sub: "Coffrets à offrir",
    text: "Sablés au beurre, biscuits du fournil et mendiants — emballés et expédiés en Chronopost.",
    isChronopost: true,
  },
};

// Métadonnées par défaut pour les nouvelles catégories
const DEFAULT_CAT_META = {
  photo: null,  // pas de photo → bandeau coloré avec juste le nom
  label: "",    // sera remplacé par le nom de la catégorie
  title: "",    // idem
  sub: "",
  text: "",
};

// Résout les métadonnées d'affichage d'une catégorie.
// Priorité : colonnes delivery_rules (back-office) > CATEGORY_META (repli) > nom.
function metaFromRule(cat, rule) {
  const base = CATEGORY_META[cat] || {};
  return {
    photo: (rule && rule.photo) || base.photo || PHOTOS.hero, // défaut : toute nouvelle catégorie prend le grand bandeau image
    label: (rule && rule.label) || base.label || cat,
    title: (rule && rule.title) || base.title || cat,
    sub:   (rule && rule.subtitle) || base.sub || "",
    text:  (rule && rule.description) || base.text || "",
    isChronopost: base.isChronopost || (rule && rule.display_section === "Biscuiterie") || false,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// LIENS DE PAIEMENT REVOLUT
// Crée un Payment Link par produit dans Revolut Business (Merchant > Payment
// links), puis colle l'URL ici en face de l'id correspondant.
// Tant qu'un lien est vide (""), le bouton "Payer en ligne" n'apparaît pas
// et le client passe par "Envoyer cette sélection" (le formulaire de contact).
// ──────────────────────────────────────────────────────────────────────────
const PAYMENT_LINKS = {
  m1: "",
  m2: "",
  m3: "",
  d1: "",
  d2: "",
  d3: "",
  s1: "",
  s2: "",
  s3: "",
  b1: "",
  b2: "",
  b3: "",
};

const MARKETS = [
  { city: "Marché à préciser", day: "Jour à préciser" },
  { city: "Marché à préciser", day: "Jour à préciser" },
  { city: "Marché de producteurs", day: "Jour à préciser" },
];

// ─── Système de notifications toast ──────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div style={{ position:"fixed", top:80, right:16, zIndex:100,
      display:"flex", flexDirection:"column", gap:8, pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:"flex", alignItems:"center", gap:10,
          background: t.type==="success" ? COLORS.blueDeep : t.type==="error" ? "#A63333" : COLORS.blueDeep,
          color: COLORS.cream, borderRadius:10, padding:".7rem 1.1rem",
          fontSize:13, fontFamily:FONT_BODY, boxShadow:"0 4px 16px rgba(43,41,37,.18)",
          animation:"toastIn .25s ease", maxWidth:280,
          opacity: t.leaving ? 0 : 1, transition:"opacity .3s ease",
        }}>
          {t.type==="success" && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.cream} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
          {t.type==="cart"    && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.cream} strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
          {t.type==="info"    && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.cream} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Mini Calendrier ─────────────────────────────────────────────────────────
const JOURS = ["Di","Lu","Ma","Me","Je","Ve","Sa"];
const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function MiniCalendar({ schedules, selectedDate, onSelect, minDate }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const earliest = minDate ? new Date(minDate) : new Date(today);
  earliest.setHours(0,0,0,0);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(earliest); d.setDate(1); return d;
  });

  // Calculer les dates disponibles selon les plannings
  const availableDates = useMemo(() => {
    const set = new Set();
    // Date de départ = earliest (sans l'heure, juste le jour)
    const startDay = new Date(earliest);
    startDay.setHours(0, 0, 0, 0);
    const end = new Date(startDay); end.setMonth(end.getMonth() + 4);
    schedules.forEach(s => {
      if (!s.active) return;
      if (s.type === "recurring" && s.day_of_week !== null) {
        let d = new Date(startDay); // commence depuis le jour minimum (inclus)
        while (d <= end) {
          if (d.getDay() === s.day_of_week) set.add(d.toISOString().split("T")[0]);
          d.setDate(d.getDate() + 1);
        }
      } else if (s.type === "specific" && s.specific_date) {
        const sd = new Date(s.specific_date);
        if (sd >= startDay) set.add(s.specific_date);
      }
    });
    return set;
  }, [schedules, minDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() { const d = new Date(viewDate); d.setMonth(d.getMonth()-1); setViewDate(d); }
  function nextMonth() { const d = new Date(viewDate); d.setMonth(d.getMonth()+1); setViewDate(d); }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ backgroundColor: COLORS.paper, border: `1px solid ${COLORS.blueSoft}`, borderRadius:10, padding:"1rem", userSelect:"none" }}>
      {/* Navigation mois */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:".75rem" }}>
        <button onClick={prevMonth} style={{ border:"none", background:"transparent", cursor:"pointer", padding:"4px" }}>
          <ChevronLeft size={16} color={COLORS.inkSoft} />
        </button>
        <p style={{ fontFamily:FONT_DISPLAY, fontSize:14, fontWeight:500 }}>
          {MOIS[month]} {year}
        </p>
        <button onClick={nextMonth} style={{ border:"none", background:"transparent", cursor:"pointer", padding:"4px" }}>
          <ChevronRight size={16} color={COLORS.inkSoft} />
        </button>
      </div>

      {/* En-têtes jours */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {JOURS.map(j => (
          <div key={j} style={{ textAlign:"center", fontSize:10, letterSpacing:".08em",
            color: COLORS.inkSoft, padding:"2px 0" }}>{j}</div>
        ))}
      </div>

      {/* Grille dates */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const isAvailable = availableDates.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const earliestDay = new Date(earliest); earliestDay.setHours(0,0,0,0);
          const isPast = new Date(dateStr) < earliestDay;
          return (
            <button key={dateStr} onClick={() => isAvailable && !isPast && onSelect(dateStr)}
              style={{
                width:"100%", aspectRatio:"1", borderRadius:6, border:"none",
                cursor: isAvailable && !isPast ? "pointer" : "default",
                fontSize:12, fontFamily:FONT_BODY,
                backgroundColor: isSelected ? COLORS.blueDeep : isAvailable && !isPast ? COLORS.cream : "transparent",
                color: isSelected ? COLORS.cream : isAvailable && !isPast ? COLORS.blueDeep : COLORS.inkSoft,
                fontWeight: isSelected || (isAvailable && !isPast) ? 500 : 400,
                opacity: isPast ? 0.3 : 1,
                outline: isAvailable && !isPast && !isSelected ? `1px solid ${COLORS.blueSoft}` : "none",
              }}>
              {d}
            </button>
          );
        })}
      </div>

      {availableDates.size === 0 && (
        <p style={{ textAlign:"center", fontSize:12, color:COLORS.inkSoft, marginTop:".5rem" }}>
          Aucune date configurée pour ce point.
        </p>
      )}

      {selectedDate && (
        <p style={{ textAlign:"center", fontSize:12, marginTop:".75rem", color:COLORS.blueDeep }}>
          ✓ {new Date(selectedDate).toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
        </p>
      )}
    </div>
  );
}

export default function ContreTempsSite() {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [toasts, setToasts] = useState([]);

  function toast(message, type="success") {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }
  const [showAccount, setShowAccount] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState({});
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ nom: "", email: "", message: "" });
  const [scrolled, setScrolled] = useState(false);

  // Produits depuis Supabase
  const [sbProducts, setSbProducts] = useState([]);
  useEffect(() => {
    sbFetch("products?active=eq.true&order=position.asc")
      .then(data => { if (data?.length) setSbProducts(data); })
      .catch(() => {});
  }, []);

  // Zone de livraison (config back-office) + vérification du code postal client
  const [zone, setZone] = useState(null);
  useEffect(() => {
    sbFetch("delivery_zone?id=eq.1")
      .then(d => { if (d?.length) setZone(d[0]); })
      .catch(() => {});
  }, []);
  const [custPostal, setCustPostal] = useState("");
  const [custGeo, setCustGeo] = useState(null);          // { lat, lng, city }
  const [zoneState, setZoneState] = useState("idle");    // idle | checking | invalid | ok | out

  const checkPostal = useCallback(async (cp) => {
    if (!/^\d{5}$/.test(cp)) { setCustGeo(null); setZoneState(cp ? "invalid" : "idle"); return; }
    setZoneState("checking");
    const g = await geocodePostal(cp);
    if (!g) { setCustGeo(null); setZoneState("invalid"); return; }
    setCustGeo(g);
    if (zone?.enabled && zone.center_lat != null) {
      const dist = haversineKm({ lat: zone.center_lat, lng: zone.center_lng }, g);
      setZoneState(dist > Number(zone.radius_km) ? "out" : "ok");
    } else {
      setZoneState("ok");
    }
  }, [zone]);

  // Commande en cours — étapes : "cart" | "form" | "done"
  const [orderStep, setOrderStep] = useState("cart");
  const [orderForm, setOrderForm] = useState({
    nom: "", email: "", phone: "", note: "",
    address: "", city: "", zip: "",
    deliveryMode: "pickup", // "pickup" | "home" | "chronopost"
    pickupPointId: "", timeSlotId: "", timeSlotLabel: "",
    pickupDate: null, paymentMethod: "onsite_cb",
  });
  const [orderLoading, setOrderLoading] = useState(false);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [deliveryRules, setDeliveryRules] = useState([]);
  const [boxContents, setBoxContents] = useState({});   // { productId: [...items] }
  const [boxOptions, setBoxOptions] = useState({});     // { productId: [...options] }
  const [selectedOptions, setSelectedOptions] = useState({}); // { productId: { optionId: bool } }
  const [hoveredItem, setHoveredItem] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [itemQty, setItemQty] = useState({});  // { itemId: quantity }

  useEffect(() => {
    Promise.all([
      sbFetch("box_contents?order=product_id,position.asc"),
      sbFetch("box_options?active=eq.true&order=product_id,position.asc"),
      sbFetch("delivery_rules?active=eq.true"),
    ]).then(([contents, options, rules]) => {
      setDeliveryRules(rules || []);
      const c = {};
      (contents || []).forEach(item => {
        if (!c[item.product_id]) c[item.product_id] = [];
        c[item.product_id].push(item);
      });
      setBoxContents(c);
      const o = {};
      (options || []).forEach(opt => {
        if (!o[opt.product_id]) o[opt.product_id] = [];
        o[opt.product_id].push(opt);
      });
      setBoxOptions(o);
    }).catch(e => console.warn("Load error:", e));
  }, []);

  useEffect(() => {
    sbFetch("pickup_points?active=eq.true&order=position.asc")
      .then(d => setPickupPoints(d || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Tous les produits viennent de Supabase — dynamique
  const allItems = useMemo(() => sbProducts.map(p => ({
    id: p.id, name: p.name, price: Number(p.price), cat: p.cat, active: p.active
  })), [sbProducts]);

  // Grouper les produits par catégorie (ordre d'apparition dans Supabase)
  const categorizedProducts = useMemo(() => {
    const cats = {};
    sbProducts.forEach(p => {
      if (!cats[p.cat]) cats[p.cat] = [];
      cats[p.cat].push(p);
    });
    return cats;
  }, [sbProducts]);

  // Détecter si le panier contient des articles Chronopost (via la règle de catégorie)
  const hasBiscuiterie = useMemo(() =>
    Object.keys(cart).some(id => {
      const p = sbProducts.find(p => p.id === id);
      if (!p) return false;
      const rule = deliveryRules.find(r => r.category === p.cat);
      return metaFromRule(p.cat, rule).isChronopost;
    }),
  [cart, sbProducts, deliveryRules]);

  const addToCart = (id, extraPrice = 0, optionLabels = []) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    const item = allItems.find(i => i.id === id);
    const name = item?.name?.split("—")[0]?.trim() || id;
    const opts = optionLabels.length > 0 ? ` + ${optionLabels.join(", ")}` : "";
    toast(`${name}${opts} ajouté`, "cart");
    // Stocker les options sélectionnées pour cet article
    if (extraPrice > 0 || optionLabels.length > 0) {
      setSelectedOptions(so => ({
        ...so,
        [id]: { extraPrice, optionLabels }
      }));
    }
    setHoveredItem(null);
    setExpandedItem(null);
  };
  const removeOne = (id) =>
    setCart((c) => {
      const next = { ...c };
      if (!next[id]) return next;
      next[id] -= 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = allItems.find((i) => i.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  // Paiement direct possible uniquement pour 1 seul produit en quantité 1,
  // si un lien Revolut a été renseigné dans PAYMENT_LINKS ci-dessus.
  const cartIds = Object.keys(cart);
  const singleId = cartIds.length === 1 ? cartIds[0] : null;
  const directPaymentLink =
    singleId && cart[singleId] === 1 && PAYMENT_LINKS[singleId] ? PAYMENT_LINKS[singleId] : null;

  // Points relais triés du plus proche au plus loin selon le code postal du client
  const sortedPickupPoints = useMemo(() => {
    if (!custGeo) return pickupPoints;
    return pickupPoints
      .map(p => ({
        ...p,
        _dist: (p.lat != null && p.lng != null) ? haversineKm(custGeo, { lat: p.lat, lng: p.lng }) : null,
      }))
      .sort((a, b) => {
        if (a._dist == null) return 1;
        if (b._dist == null) return -1;
        return a._dist - b._dist;
      });
  }, [pickupPoints, custGeo]);

  // Blocage hors zone : si la zone est active, le client doit saisir un code postal valide ET dans le rayon
  const zoneActive = !!zone?.enabled;
  const orderBlocked = zoneActive && zoneState === "out";
  const postalOk = !zoneActive || zoneState === "ok";
  // Les points de vente / modes de retrait n'apparaissent qu'une fois la zone validée
  const showDeliveryOptions = !zoneActive || zoneState === "ok";

  const navLinks = [
    { href: "#rythmes", label: "Nos box" },
    { href: "#biscuiterie", label: "Biscuiterie" },
    { href: "#entreprises", label: "Entreprises" },
    { href: "#marches", label: "Marchés" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <div style={{ fontFamily: FONT_BODY, color: COLORS.ink, backgroundColor: COLORS.paper }} className="min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Outfit:wght@300;400;500&display=swap');
        html { scroll-behavior: smooth; }
        .tracked { letter-spacing: 0.16em; }
        .tracked-lg { letter-spacing: 0.32em; }
        input::placeholder, textarea::placeholder { color: rgba(43,41,37,0.35); }
        input, textarea { font-family: 'Outfit', sans-serif; }
        @keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* NAV */}
      <header
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? COLORS.blueDeep : "transparent",
          boxShadow: scrolled ? "0 1px 0 rgba(255,255,255,0.08)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HeartMark size={30} tone="cream" />
            <span style={{ fontFamily: FONT_DISPLAY, color: COLORS.cream }} className="text-base tracking-tight">
              à contre-temps
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-10">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="tracked text-[11px] uppercase" style={{ color: COLORS.cream, opacity: 0.85 }}>
                {l.label}
              </a>
            ))}
            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-full text-xs tracked uppercase"
              style={{ border: `1px solid ${COLORS.cream}`, color: COLORS.cream }}
            >
              <ShoppingBag size={14} />
              {cartCount > 0 ? `Sélection (${cartCount})` : "Composer"}
            </button>
            <button
              onClick={() => user ? setShowAccount(true) : setShowAuth(true)}
              style={{ background:"transparent", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center" }}
            >
              {user ? (
                <div style={{ width:34, height:34, borderRadius:"50%",
                  backgroundColor:COLORS.cream, color:COLORS.blueDeep,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:12, fontWeight:700, fontFamily:FONT_BODY }}>
                  {(user.email||"?")[0].toUpperCase()}
                </div>
              ) : (
                <div className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full text-xs tracked uppercase"
                  style={{ border:`1px solid rgba(243,231,218,0.45)`, color:COLORS.cream, opacity:0.85 }}>
                  <User size={14} />
                  Connexion
                </div>
              )}
            </button>
          </nav>

          <div className="md:hidden flex items-center gap-4">
            <button onClick={() => setCartOpen(true)} className="relative" aria-label="Voir la sélection">
              <ShoppingBag size={20} color={COLORS.cream} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-2 -right-2 text-[9px] rounded-full w-4 h-4 flex items-center justify-center"
                  style={{ backgroundColor: COLORS.rust, color: COLORS.cream }}
                >
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => setMenuOpen((m) => !m)} aria-label="Menu">
              {menuOpen ? <X size={20} color={COLORS.cream} /> : <Menu size={20} color={COLORS.cream} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden px-6 pb-6 flex flex-col gap-5" style={{ backgroundColor: COLORS.blueDeep }}>
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="tracked text-xs uppercase" style={{ color: COLORS.cream }}>
                {l.label}
              </a>
            ))}
            <button
              onClick={() => { setMenuOpen(false); user ? setShowAccount(true) : setShowAuth(true); }}
              className="tracked text-xs uppercase text-left flex items-center gap-2"
              style={{ color: COLORS.cream, background:"transparent", border:"none", cursor:"pointer", padding:0 }}>
              <User size={14} />
              {user ? "Mon compte" : "Connexion"}
            </button>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden px-6 md:px-10 pt-44 pb-28 md:pt-56 md:pb-40 text-center flex flex-col items-center" style={{ backgroundColor: COLORS.blue }}>
        <img src={PHOTOS.hero} alt="fournil" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.2 }} />
        <GrainOverlay />
        <div className="relative">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <HeartMark size={78} tone="cream" />
          </div>
          <h1 style={{ fontFamily: FONT_DISPLAY, color: COLORS.cream, fontWeight: 400 }} className="mt-7 text-6xl md:text-8xl tracking-tight">
            à contre-temps
          </h1>
          <p className="tracked-lg text-[11px] md:text-xs mt-5" style={{ color: COLORS.cream, opacity: 0.85 }}>
            FOURNIL VIVANT
          </p>
          <p className="mt-10 max-w-md mx-auto text-[15px] md:text-base leading-loose" style={{ color: COLORS.cream, opacity: 0.88, fontWeight: 300 }}>
            Le pain prend son temps. Nos fournées naissent la nuit, loin des
            cadences, pour arriver fraîches à contre-temps de vos journées
            pressées.
          </p>
          <a href="#rythmes" className="mt-12 inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-xs tracked uppercase" style={{ backgroundColor: COLORS.cream, color: COLORS.blueDeep }}>
            Découvrir nos box
            <ArrowRight size={14} />
          </a>
        </div>
      </section>

      <div className="px-6 md:px-10">
        <div className="max-w-xl mx-auto py-10 md:py-14">
          <PulseLine />
        </div>
      </div>

      {/* MANIFESTO */}
      <section className="px-6 md:px-10 pb-16 md:pb-24 max-w-2xl mx-auto text-center">
        <p style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontWeight: 400, color: COLORS.blueDeep }} className="text-2xl md:text-3xl leading-snug">
          Farines locales, levain vivant, circuits courts — un fournil qui
          respire au rythme des producteurs, pas des horloges.
        </p>
      </section>

      {/* SECTIONS DYNAMIQUES — groupées par display_section depuis Supabase */}
      {(() => {
        // Grouper les catégories par section (display_section de delivery_rules)
        const sections = {};
        Object.entries(categorizedProducts).forEach(([cat, items]) => {
          const rule = deliveryRules.find(r => r.category === cat);
          const meta = metaFromRule(cat, rule);
          if (meta.isChronopost) return; // biscuiterie gérée séparément plus bas
          const section = rule?.display_section || "Nos box";
          if (section !== "Nos box") return; // chapitre à part → grand format pleine largeur (bloc plus bas)
          if (!sections[section]) sections[section] = [];
          sections[section].push({ cat, items, rule, order: rule?.display_order || 99 });
        });
        // Trier par display_order dans chaque section
        Object.values(sections).forEach(arr => arr.sort((a,b) => a.order - b.order));
        return Object.entries(sections).map(([sectionName, catItems]) => (
          <section key={sectionName} id={sectionName.toLowerCase().replace(/\s+/g,"-")}
            className="px-6 md:px-10 py-20 md:py-28"
            style={{ backgroundColor: COLORS.paper }}>
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400 }} className="text-3xl md:text-5xl tracking-tight">
                  {sectionName}
                </h2>
              </div>
              <div className={`grid gap-8 ${catItems.length === 1 ? "max-w-md mx-auto" : catItems.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3"}`}>
      {catItems.map(({ cat, items, rule }) => {
        const meta = metaFromRule(cat, rule);
        const deliveryRule = rule;
        return (
          <div key={cat} style={{ backgroundColor:COLORS.paper, border:`1px solid ${COLORS.blueSoft}`, borderRadius:12, overflow:"hidden" }}>
            <div>
              {/* Photo ou bandeau coloré */}
              {meta.photo ? (
                <div style={{ height:180, overflow:"hidden", position:"relative", flexShrink:0 }}>
                  <img src={meta.photo} alt={cat} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(62,90,112,.55) 0%, transparent 60%)" }} />
                  <div style={{ position:"absolute", bottom:12, left:16 }}>
                    <p style={{ fontSize:10, letterSpacing:".16em", color:COLORS.cream, opacity:.85 }}>{(meta.label||cat).toUpperCase()}</p>
                    <p style={{ fontFamily:FONT_DISPLAY, fontSize:18, fontWeight:500, color:COLORS.cream, marginTop:2 }}>{meta.title||cat}</p>
                  </div>
                </div>
              ) : (
                <div style={{ height:80, background:`linear-gradient(135deg, ${COLORS.blueDeep}, ${COLORS.blue})`,
                  display:"flex", alignItems:"center", padding:"0 1.25rem" }}>
                  <div>
                    <p style={{ fontSize:9, letterSpacing:".18em", color:COLORS.cream, opacity:.7 }}>{(meta.label||cat).toUpperCase()}</p>
                    <p style={{ fontFamily:FONT_DISPLAY, fontSize:16, fontWeight:500, color:COLORS.cream, marginTop:2 }}>{meta.title||cat}</p>
                  </div>
                </div>
              )}

              {/* Sous-titre et infos livraison — une seule fois */}
              <div style={{ padding:"1rem 1.25rem .5rem" }}>
                {meta.sub && <p style={{ fontFamily:FONT_DISPLAY, fontStyle:"italic", color:COLORS.inkSoft, fontSize:13 }}>{meta.sub}</p>}
                {meta.text && <p style={{ fontSize:12, color:COLORS.inkSoft, lineHeight:1.6, marginTop:4 }}>{meta.text}</p>}
                {deliveryRule?.notes && <p style={{ fontSize:11, color:COLORS.rust, marginTop:6 }}>{deliveryRule.notes}</p>}
              </div>

              {/* Produits */}
              <div style={{ borderTop:`1px solid ${COLORS.blueSoft}` }}>
                {items.map((item, idx) => {
                  const contents = boxContents[item.id] || [];
                  const options = boxOptions[item.id] || [];
                  const isOpen = hoveredItem === item.id || expandedItem === item.id;
                  const optSel = selectedOptions[item.id] || {};
                  const checkedOpts = options.filter(o => optSel[o.id]);
                  const extraPrice = checkedOpts.reduce((s, o) => s + Number(o.price), 0);
                  return (
                    <div key={item.id}
                      style={{ borderBottom: idx < items.length-1 ? `1px solid ${COLORS.blueSoft}` : "none" }}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}>
                      <div className="py-3.5 px-6">
                        {/* Nom + prix */}
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8,
                          cursor: contents.length > 0 ? "pointer" : "default", marginBottom:".5rem" }}
                          onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}>
                          <p style={{ fontSize:13, lineHeight:1.35 }}>
                            {item.name}
                            {contents.length > 0 && (
                              <span style={{ fontSize:9, letterSpacing:".1em", color:COLORS.rust, opacity:.7, marginLeft:5 }}>
                                {isOpen ? "▲" : "▼"}
                              </span>
                            )}
                          </p>
                          <p style={{ fontSize:12, color:COLORS.inkSoft, whiteSpace:"nowrap", flexShrink:0 }}>
                            {(item.price + extraPrice).toFixed(2)} €
                            {extraPrice > 0 && <span style={{ color:COLORS.rust }}> +{extraPrice.toFixed(2)} €</span>}
                          </p>
                        </div>

                        {/* Stepper + Ajouter */}
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8,
                            border:`1px solid ${COLORS.blueSoft}`, borderRadius:7, padding:"4px 10px" }}>
                            <button onClick={e => { e.stopPropagation(); setItemQty(q => ({ ...q, [item.id]: Math.max(1, (q[item.id]||1) - 1) })); }}
                              style={{ border:"none", background:"transparent", cursor:"pointer",
                                fontSize:18, color:COLORS.blue, lineHeight:1, padding:0, width:18 }}>−</button>
                            <span style={{ fontSize:13, fontWeight:500, minWidth:16, textAlign:"center" }}>
                              {itemQty[item.id] || 1}
                            </span>
                            <button onClick={e => { e.stopPropagation(); setItemQty(q => ({ ...q, [item.id]: (q[item.id]||1) + 1 })); }}
                              style={{ border:"none", background:"transparent", cursor:"pointer",
                                fontSize:18, color:COLORS.blue, lineHeight:1, padding:0, width:18 }}>+</button>
                          </div>
                          <button onClick={() => {
                              const qty = itemQty[item.id] || 1;
                              for (let i = 0; i < qty; i++) addToCart(item.id, extraPrice, checkedOpts.map(o => o.name));
                              setItemQty(q => ({ ...q, [item.id]: 1 }));
                            }}
                            style={{ flex:1, border:"none", background:COLORS.blueDeep, color:COLORS.cream,
                              borderRadius:7, padding:"6px 0", fontSize:10,
                              letterSpacing:".12em", cursor:"pointer", fontFamily:"inherit" }}>
                            AJOUTER
                          </button>
                        </div>

                        {/* Détail box au survol/clic */}
                        {isOpen && (contents.length > 0 || options.length > 0) && (
                          <div style={{ padding:".75rem 0 .25rem", borderTop:`1px dashed ${COLORS.blueSoft}`, marginTop:".75rem" }}>
                            {contents.length > 0 && (
                              <div style={{ marginBottom: options.length > 0 ? ".75rem" : 0 }}>
                                <p style={{ fontSize:10, letterSpacing:".14em", color:COLORS.rust, marginBottom:".4rem" }}>CONTENU</p>
                                {contents.map((c, i) => (
                                  <p key={i} style={{ fontSize:12, color:COLORS.inkSoft, padding:"2px 0", display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{ color:COLORS.rust, opacity:.6 }}>·</span> {c.item}
                                  </p>
                                ))}
                              </div>
                            )}
                            {options.length > 0 && (
                              <div>
                                <p style={{ fontSize:10, letterSpacing:".14em", color:COLORS.blueDeep, marginBottom:".4rem" }}>OPTIONS</p>
                                {options.map(opt => (
                                  <label key={opt.id} style={{ display:"flex", alignItems:"center", gap:8,
                                    padding:"3px 0", fontSize:12, cursor:"pointer" }}>
                                    <input type="checkbox"
                                      checked={!!optSel[opt.id]}
                                      onChange={e => setSelectedOptions(so => ({
                                        ...so, [item.id]: { ...(so[item.id]||{}), [opt.id]: e.target.checked }
                                      }))}
                                      style={{ accentColor: COLORS.blueDeep }} />
                                    <span style={{ flex:1 }}>{opt.name}</span>
                                    <span style={{ color:COLORS.inkSoft }}>+{Number(opt.price).toFixed(2)} €</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
              </div>
            </div>
          </section>
        ));
      })()}

      {/* CHAPITRES À PART (biscuiterie + toute rubrique hors « Nos box ») — grand format pleine largeur */}
      {Object.entries(categorizedProducts).filter(([cat]) => {
        const rule = deliveryRules.find(r => r.category === cat);
        const section = rule?.display_section || "Nos box";
        return section !== "Nos box"; // tout chapitre dédié → grand bandeau type biscuiterie
      }).map(([cat, items]) => {
        const deliveryRule = deliveryRules.find(r => r.category === cat);
        const meta = metaFromRule(cat, deliveryRule);
        const anchorId = meta.isChronopost ? "biscuiterie" : cat.toLowerCase().replace(/\s+/g,"-");
        return (
          <section key={cat} id={anchorId} className="px-6 md:px-10 py-20 md:py-28" style={{ backgroundColor: COLORS.cream }}>
            <div className="max-w-5xl mx-auto">
              {meta.photo && (
                <div style={{ height:280, borderRadius:12, overflow:"hidden", marginBottom:"2rem", position:"relative" }}>
                  <img src={meta.photo} alt={cat} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(62,90,112,.65) 0%, transparent 65%)" }} />
                  <div style={{ position:"absolute", bottom:28, left:32 }}>
                    <p style={{ fontSize:10, letterSpacing:".18em", color:COLORS.cream, opacity:.8 }}>{(meta.label||cat).toUpperCase()}</p>
                    <p style={{ fontFamily:FONT_DISPLAY, fontSize:30, fontWeight:500, color:COLORS.cream, marginTop:6 }}>{meta.title||cat}</p>
                    <p style={{ fontSize:13, color:COLORS.cream, opacity:.85, marginTop:6, maxWidth:340, lineHeight:1.65 }}>{meta.text}</p>
                  </div>
                </div>
              )}
              <div className="text-center mb-8">
                <Eyebrow>{(meta.label||cat).toUpperCase()}</Eyebrow>
                <h2 style={{ fontFamily:FONT_DISPLAY, fontWeight:400 }} className="text-3xl md:text-5xl mt-4 tracking-tight">{meta.title||cat}</h2>
                <p className="max-w-md mx-auto mt-5 text-[15px] leading-loose" style={{ color:COLORS.inkSoft }}>{meta.text}</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-6 mt-12">
                {items.map(item => (
                  <div key={item.id} style={{ backgroundColor:COLORS.paper, border:`1px solid ${COLORS.blueSoft}`, borderRadius:10, overflow:"hidden" }}>
                    {/* Photo d'illustration du produit (colonne products.photo) */}
                    <div style={{ height:150, background:`linear-gradient(135deg, ${COLORS.blueSoft}, ${COLORS.cream})` }}>
                      {item.photo && <img src={item.photo} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />}
                    </div>
                    <div style={{ padding:"1.25rem" }}>
                    <p style={{ fontFamily:FONT_DISPLAY, fontSize:17, marginBottom:4 }}>{item.name}</p>
                    <p style={{ color:COLORS.inkSoft, fontSize:13, marginBottom:"1rem" }}>{Number(item.price).toFixed(2)} €</p>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, border:`1px solid ${COLORS.blueSoft}`, borderRadius:7, padding:"4px 10px" }}>
                        <button onClick={() => setItemQty(q => ({ ...q, [item.id]: Math.max(1,(q[item.id]||1)-1) }))}
                          style={{ border:"none", background:"transparent", cursor:"pointer", fontSize:18, color:COLORS.blue, lineHeight:1, padding:0, width:18 }}>−</button>
                        <span style={{ fontSize:13, fontWeight:500, minWidth:16, textAlign:"center" }}>{itemQty[item.id]||1}</span>
                        <button onClick={() => setItemQty(q => ({ ...q, [item.id]: (q[item.id]||1)+1 }))}
                          style={{ border:"none", background:"transparent", cursor:"pointer", fontSize:18, color:COLORS.blue, lineHeight:1, padding:0, width:18 }}>+</button>
                      </div>
                      <button onClick={() => { const qty=itemQty[item.id]||1; for(let i=0;i<qty;i++) addToCart(item.id); setItemQty(q=>({...q,[item.id]:1})); }}
                        style={{ flex:1, border:"none", background:COLORS.blueDeep, color:COLORS.cream, borderRadius:7, padding:"6px 0", fontSize:10, letterSpacing:".12em", cursor:"pointer", fontFamily:"inherit" }}>
                        AJOUTER
                      </button>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* ENTREPRISES */}
      <section id="entreprises" className="relative px-6 md:px-10 py-24 md:py-32 overflow-hidden" style={{ backgroundColor: COLORS.blueDeep }}>
        <GrainOverlay />
        <div className="relative max-w-2xl mx-auto text-center">
          <Eyebrow color="rgba(243,231,218,0.55)">POUR LES ÉQUIPES</Eyebrow>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400, color: COLORS.cream }} className="text-3xl md:text-5xl mt-4 tracking-tight">
            Un évènement, une équipe à nourrir ?
          </h2>
          <p className="mt-6 leading-loose text-[15px]" style={{ color: COLORS.cream, opacity: 0.8, fontWeight: 300 }}>
            Petit-déjeuner récurrent, séminaire, pause déjeuner : décrivez
            votre besoin, nous composons une box sur mesure, livrée à
            l'heure qui vous arrange.
          </p>
          <a href="#contact" className="mt-10 inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-xs tracked uppercase" style={{ backgroundColor: COLORS.cream, color: COLORS.blueDeep }}>
            Demander un devis
            <ArrowRight size={14} />
          </a>
        </div>
      </section>

      {/* MARCHÉS */}
      <section id="marches" className="px-6 md:px-10 py-20 md:py-28 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <Eyebrow>RETROUVEZ-NOUS</Eyebrow>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400 }} className="text-3xl md:text-5xl mt-4 tracking-tight">
            Sur les marchés
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-px md:gap-6">
          {MARKETS.map((m, i) => (
            <div key={i} className="p-7 text-center" style={{ border: `1px solid ${COLORS.blueSoft}` }}>
              <MapPin size={15} color={COLORS.rust} className="mx-auto" strokeWidth={1.6} />
              <p style={{ fontFamily: FONT_DISPLAY, fontWeight: 500 }} className="mt-3 text-lg">
                {m.city}
              </p>
              <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>{m.day}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="px-6 md:px-10 py-20 md:py-28" style={{ backgroundColor: COLORS.cream }}>
        <div className="max-w-md mx-auto text-center">
          <Eyebrow>UNE QUESTION, UNE ENVIE</Eyebrow>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 400 }} className="text-3xl md:text-5xl mt-4 tracking-tight">
            Parlons-en
          </h2>

          {sent ? (
            <div className="mt-12 py-10" style={{ borderTop: `1px solid ${COLORS.blue}`, borderBottom: `1px solid ${COLORS.blue}` }}>
              <HeartMark size={30} tone="rust" />
              <p className="mt-4 text-sm" style={{ color: COLORS.inkSoft }}>
                Message prêt à être envoyé. Merci, nous revenons vers vous vite.
              </p>
            </div>
          ) : (
            <div className="mt-12 flex flex-col gap-7 text-left">
              <div>
                <label className="text-[10px] tracked uppercase" style={{ color: COLORS.inkSoft }}>Nom</label>
                <input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full mt-2 pb-2 bg-transparent outline-none text-sm"
                  style={{ borderBottom: `1px solid ${COLORS.blue}` }}
                />
              </div>
              <div>
                <label className="text-[10px] tracked uppercase" style={{ color: COLORS.inkSoft }}>Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-2 pb-2 bg-transparent outline-none text-sm"
                  style={{ borderBottom: `1px solid ${COLORS.blue}` }}
                />
              </div>
              <div>
                <label className="text-[10px] tracked uppercase" style={{ color: COLORS.inkSoft }}>Votre besoin</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={3}
                  className="w-full mt-2 pb-2 bg-transparent outline-none text-sm resize-none"
                  style={{ borderBottom: `1px solid ${COLORS.blue}` }}
                />
              </div>
              <button
                onClick={() => setSent(true)}
                className="mt-3 px-8 py-3.5 rounded-full text-xs tracked uppercase self-center"
                style={{ backgroundColor: COLORS.rust, color: COLORS.cream }}
              >
                Envoyer
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-10 py-16" style={{ backgroundColor: COLORS.blue }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-start justify-between gap-12">
          <div>
            <div className="flex items-center gap-2.5">
              <HeartMark size={18} tone="cream" />
              <span style={{ fontFamily: FONT_DISPLAY, color: COLORS.cream }} className="text-base">à contre-temps</span>
            </div>
            <p className="text-[11px] mt-2 tracked" style={{ color: COLORS.cream, opacity: 0.65 }}>FOURNIL VIVANT</p>
          </div>

          <div className="flex flex-col gap-2.5 text-sm" style={{ color: COLORS.cream, opacity: 0.9 }}>
            <div className="flex items-center gap-2.5"><MapPin size={13} strokeWidth={1.6} /> Gerzat (63360)</div>
            <div className="flex items-center gap-2.5"><Phone size={13} strokeWidth={1.6} /> [Votre téléphone]</div>
            <div className="flex items-center gap-2.5"><Mail size={13} strokeWidth={1.6} /> acontretemps@fournilvivant.fr</div>
          </div>

          {/* Réseaux sociaux */}
          <div>
            <p className="text-[10px] tracked mb-4" style={{ color: COLORS.cream, opacity: 0.55 }}>SUIVEZ-NOUS</p>
            <div className="flex gap-3">
              {[
                { name: "Facebook",  url: "", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill={COLORS.cream}><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg> },
                { name: "Instagram", url: "", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.cream} strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill={COLORS.cream} stroke="none"/></svg> },
                { name: "TikTok",    url: "", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill={COLORS.cream}><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg> },
              ].map(({ name, url, icon }) => (
                url ? (
                  <a key={name} href={url} target="_blank" rel="noopener noreferrer"
                    title={name}
                    style={{ width:38, height:38, borderRadius:"50%",
                      backgroundColor:"rgba(255,255,255,.12)",
                      border:"1px solid rgba(255,255,255,.2)",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {icon}
                  </a>
                ) : (
                  <div key={name} title={`${name} — bientôt`}
                    style={{ width:38, height:38, borderRadius:"50%",
                      backgroundColor:"rgba(255,255,255,.07)",
                      border:"1px dashed rgba(255,255,255,.2)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      opacity:0.5, cursor:"default" }}>
                    {icon}
                  </div>
                )
              ))}
            </div>
            <p className="text-[10px] mt-3" style={{ color: COLORS.cream, opacity: 0.4 }}>Comptes en cours de création</p>
          </div>
        </div>
        <p className="text-center text-[11px] mt-14 opacity-55" style={{ color: COLORS.cream }}>
          © {new Date().getFullYear()} à contre-temps — fournil vivant
        </p>
      </footer>

      {/* TOASTS */}
      <ToastContainer toasts={toasts} />

      {/* AUTH MODAL */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(msg) => { setShowAuth(false); toast(msg || "Connexion réussie !", "success"); }}
        />
      )}

      {/* MON COMPTE */}
      {showAccount && user && (
        <MonCompte user={user} onClose={() => setShowAccount(false)} />
      )}

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(43,41,37,0.4)" }} onClick={() => { setCartOpen(false); setOrderStep("cart"); }} />
          <div className="relative w-full max-w-sm h-full p-7 overflow-y-auto" style={{ backgroundColor: COLORS.paper }}>

            {/* En-tête */}
            <div className="flex items-center justify-between mb-8">
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500 }} className="text-xl">
                {orderStep === "cart" ? "Ma sélection" : orderStep === "form" ? "Mes coordonnées" : "Commande envoyée"}
              </h3>
              <button onClick={() => { setCartOpen(false); setOrderStep("cart"); }} aria-label="Fermer"><X size={20} /></button>
            </div>

            {/* ÉTAPE 1 — Panier */}
            {orderStep === "cart" && (
              cartCount === 0 ? (
                <p className="text-sm" style={{ color: COLORS.inkSoft }}>
                  Rien pour l'instant. Ajoutez une box depuis "Nos box" pour composer votre sélection.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {Object.entries(cart).map(([id, qty]) => {
                    const item = allItems.find((i) => i.id === id);
                    if (!item) return null;
                    return (
                      <div key={id} className="flex items-center justify-between gap-3 pb-4" style={{ borderBottom: `1px solid ${COLORS.blueSoft}` }}>
                        <div>
                          <p className="text-sm">{item.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: COLORS.inkSoft }}>{item.price.toFixed(2)} €</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => removeOne(id)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: `1px solid ${COLORS.blue}` }}><Minus size={12} /></button>
                          <span className="text-sm w-4 text-center">{qty}</span>
                          <button onClick={() => addToCart(id)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: `1px solid ${COLORS.blue}` }}><Plus size={12} /></button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between mt-3 pt-4" style={{ borderTop: `1px solid ${COLORS.ink}` }}>
                    <span className="text-sm" style={{ color: COLORS.inkSoft }}>Total indicatif</span>
                    <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 500 }} className="text-xl">{cartTotal.toFixed(2)} €</span>
                  </div>

                  {directPaymentLink && (
                    <a href={directPaymentLink} target="_blank" rel="noopener noreferrer"
                      className="mt-1 text-center px-6 py-3.5 rounded-full text-xs tracked uppercase"
                      style={{ backgroundColor: COLORS.blueDeep, color: COLORS.cream }}>
                      Payer en ligne avec Revolut
                    </a>
                  )}

                  <button onClick={() => {
                      if (user) {
                        // Pré-remplir avec les infos du compte
                        import("./Auth.jsx").then(({ supabase }) => {
                          supabase.from("clients").select("*").eq("id", user.id).single()
                            .then(({ data }) => {
                              if (data) setOrderForm(f => ({
                                ...f,
                                nom: data.name || f.nom,
                                email: user.email || f.email,
                                phone: data.phone || f.phone,
                                address: data.address || f.address,
                                city: data.city || f.city,
                                zip: data.zip || f.zip,
                              }));
                            });
                        });
                      }
                      setOrderStep("form");
                    }}
                    className="mt-2 text-center px-6 py-3.5 rounded-full text-xs tracked uppercase"
                    style={{ backgroundColor: COLORS.rust, color: COLORS.cream }}>
                    Commander →
                  </button>
                </div>
              )
            )}

            {/* ÉTAPE 2 — Formulaire */}
            {orderStep === "form" && (
              <div className="flex flex-col gap-5">
                {[
                  { label: "Nom", key: "nom", type: "text", placeholder: "Votre nom" },
                  { label: "Email", key: "email", type: "email", placeholder: "votre@email.fr" },
                  { label: "Téléphone", key: "phone", type: "tel", placeholder: "06 …" },
                  { label: "Note (optionnel)", key: "note", type: "text", placeholder: "Allergies, précisions…" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="text-[10px] tracked uppercase" style={{ color: COLORS.inkSoft }}>{label}</label>
                    <input type={type} placeholder={placeholder} value={orderForm[key]}
                      onChange={e => setOrderForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full mt-2 pb-2 bg-transparent outline-none text-sm"
                      style={{ borderBottom: `1px solid ${COLORS.blue}`, fontFamily: "inherit" }} />
                  </div>
                ))}

                {/* Calendrier de livraison selon la catégorie */}
                {(() => {
                  // Trouver la règle applicable au panier (match exact par nom de catégorie)
                  const cartCats = [...new Set(
                    Object.keys(cart).map(id => {
                      const item = allItems.find(i => i.id === id);
                      return item ? (item.cat || null) : null;
                    }).filter(Boolean)
                  )];
                  const rule = deliveryRules.find(r => cartCats.includes(r.category)) || deliveryRules[0];
                  if (!rule) return null;
                  const minDate = new Date();
                  minDate.setHours(minDate.getHours() + rule.advance_hours);
                  const delivFee = rule.delivery_fee > 0
                    ? (Object.entries(cart).reduce((s,[id,qty]) => { const it=allItems.find(i=>i.id===id); return s+(it?.price||0)*qty; },0) >= (rule.franco_amount||99999) ? 0 : rule.delivery_fee)
                    : 0;
                  return (
                    <div>
                      <p className="text-[10px] tracked uppercase mb-2" style={{ color: COLORS.rust }}>
                        Date de {rule.mode === "delivery" ? "livraison" : "retrait"} souhaitée
                      </p>
                      <p style={{ fontSize:11, color:COLORS.inkSoft, marginBottom:".75rem", lineHeight:1.6 }}>
                        {rule.notes}
                        {delivFee > 0 && <span style={{ color:COLORS.rust }}> · Frais de port : {delivFee.toFixed(2)} €</span>}
                        {delivFee === 0 && rule.delivery_fee > 0 && <span style={{ color:"#4A7C59" }}> · Livraison offerte ✓</span>}
                      </p>
                      <MiniCalendar
                        schedules={rule.available_days.map(d => ({ type:"recurring", day_of_week:d, active:true }))}
                        selectedDate={orderForm.pickupDate}
                        onSelect={d => setOrderForm(f => ({ ...f, pickupDate:d }))}
                        minDate={minDate}
                      />
                    </div>
                  );
                })()}

                {/* Lieu de livraison — code postal : vérifie la zone + révèle les points proches */}
                <div className="pt-2">
                  <p className="text-[10px] tracked uppercase mb-2" style={{ color: COLORS.rust }}>
                    Où souhaitez-vous être livré ?
                  </p>
                  <label className="text-[10px] tracked uppercase" style={{ color: COLORS.inkSoft }}>
                    Code postal {zoneActive && <span style={{ color: COLORS.rust }}>*</span>}
                  </label>
                  <input
                    type="text" inputMode="numeric" maxLength={5} placeholder="63000"
                    value={custPostal}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                      setCustPostal(v);
                      checkPostal(v);
                    }}
                    className="w-full mt-2 pb-2 bg-transparent outline-none text-sm"
                    style={{ borderBottom: `1px solid ${orderBlocked ? "#A63333" : COLORS.blue}`, fontFamily: "inherit" }} />
                  {zoneState === "checking" && (
                    <p style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 6 }}>Vérification…</p>
                  )}
                  {zoneState === "invalid" && custPostal.length === 5 && (
                    <p style={{ fontSize: 11, color: "#A63333", marginTop: 6 }}>Code postal introuvable.</p>
                  )}
                  {zoneState === "ok" && custGeo && (
                    <p style={{ fontSize: 11, color: "#4A7C59", marginTop: 6 }}>✓ {custGeo.city} — points de vente proches ci-dessous</p>
                  )}
                  {orderBlocked && (
                    <div style={{ marginTop: 10, padding: ".75rem .9rem", borderRadius: 8, background: "rgba(166,51,51,.08)", border: "1px solid rgba(166,51,51,.35)" }}>
                      <p style={{ fontSize: 13, color: "#A63333", fontWeight: 500, marginBottom: 2 }}>Hors zone de livraison</p>
                      <p style={{ fontSize: 12, color: COLORS.inkSoft, lineHeight: 1.5 }}>
                        {zone?.message || "Nous ne livrons pas encore dans votre zone."}
                        {custGeo && ` (${custGeo.city})`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Mode de retrait — affiché une fois la zone validée */}
                {showDeliveryOptions && !hasBiscuiterie && (
                  <div className="pt-2">
                    <p className="text-[10px] tracked uppercase mb-3" style={{ color: COLORS.rust }}>
                      Mode de retrait
                    </p>
                    <div className="flex flex-col gap-2">
                      {[
                        { value: "pickup", label: "Point relais / Marché" },
                        { value: "home",   label: "Livraison à domicile" },
                      ].map(opt => (
                        <label key={opt.value} style={{ display:"flex", alignItems:"center", gap:10,
                          padding:".65rem .9rem", border:`1px solid ${orderForm.deliveryMode===opt.value ? COLORS.blueDeep : COLORS.blueSoft}`,
                          borderRadius:8, cursor:"pointer", fontSize:13,
                          backgroundColor: orderForm.deliveryMode===opt.value ? COLORS.blueDeep+"11" : "transparent" }}>
                          <input type="radio" name="deliveryMode" value={opt.value}
                            checked={orderForm.deliveryMode===opt.value}
                            onChange={() => setOrderForm(f => ({ ...f, deliveryMode:opt.value, pickupPointId:"", timeSlotId:"", timeSlotLabel:"" }))}
                            style={{ accentColor: COLORS.blueDeep }} />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sélection point relais */}
                {showDeliveryOptions && orderForm.deliveryMode === "pickup" && !hasBiscuiterie && pickupPoints.length > 0 && (
                  <div>
                    <label className="text-[10px] tracked uppercase" style={{ color: COLORS.inkSoft }}>Point de retrait</label>
                    <select value={orderForm.pickupPointId}
                      onChange={async e => {
                        const id = e.target.value;
                        setOrderForm(f => ({ ...f, pickupPointId: id, timeSlotId:"", timeSlotLabel:"" }));
                        setSelectedDate(null);
                        if (id) {
                          const [sl, sc] = await Promise.all([
                            sbFetch(`time_slots?pickup_point_id=eq.${id}&active=eq.true&order=position.asc`),
                            sbFetch(`market_schedules?pickup_point_id=eq.${id}&active=eq.true`),
                          ]);
                          setTimeSlots(sl || []);
                          setSchedules(sc || []);
                        } else { setTimeSlots([]); setSchedules([]); }
                      }}
                      className="w-full mt-2 bg-transparent outline-none text-sm"
                      style={{ border:"none", borderBottom:`1px solid ${COLORS.blue}`, fontFamily:"inherit", fontSize:14, padding:".5rem 0" }}>
                      <option value="">
                        {custGeo ? "— Du plus proche au plus loin —" : "— Choisir un point de retrait —"}
                      </option>
                      {sortedPickupPoints.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.day ? ` — ${p.day}` : ""}{p.address ? ` (${p.address})` : ""}
                          {p._dist != null ? ` · à ${p._dist < 1 ? "<1" : Math.round(p._dist)} km` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sélection créneau */}
                {orderForm.pickupPointId && timeSlots.length > 0 && (
                  <div>
                    <label className="text-[10px] tracked uppercase" style={{ color: COLORS.inkSoft }}>Créneau horaire</label>
                    <select value={orderForm.timeSlotId}
                      onChange={e => {
                        const sl = timeSlots.find(s => s.id===e.target.value);
                        setOrderForm(f => ({ ...f, timeSlotId:e.target.value, timeSlotLabel:sl?.label||"" }));
                      }}
                      className="w-full mt-2 bg-transparent outline-none text-sm"
                      style={{ border:"none", borderBottom:`1px solid ${COLORS.blue}`, fontFamily:"inherit", fontSize:14, padding:".5rem 0" }}>
                      <option value="">— Choisir un créneau —</option>
                      {timeSlots.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Calendrier des marchés — uniquement si pas de règle livraison */}
                {orderForm.pickupPointId && schedules.length > 0 && deliveryRules.length === 0 && (
                  <div>
                    <label className="text-[10px] tracked uppercase mb-3 block" style={{ color: COLORS.inkSoft }}>
                      Choisir une date
                    </label>
                    <MiniCalendar
                      schedules={schedules}
                      selectedDate={selectedDate}
                      onSelect={d => { setSelectedDate(d); setOrderForm(f => ({ ...f, pickupDate: d })); }}
                    />
                  </div>
                )}

                {/* Options de paiement */}
                {showDeliveryOptions && orderForm.deliveryMode === "pickup" && !hasBiscuiterie && (
                  <div className="pt-2">
                    <p className="text-[10px] tracked uppercase mb-3" style={{ color: COLORS.rust }}>
                      Mode de paiement
                    </p>
                    <div className="flex flex-col gap-2">
                      {[
                        { value:"onsite_cb",   icon:<CreditCard size={14}/>,  label:"CB sur place" },
                        { value:"onsite_cash", icon:<Banknote size={14}/>,    label:"Espèces sur place" },
                        { value:"online",      icon:<Smartphone size={14}/>,  label:"Paiement en ligne (Revolut)" },
                      ].map(opt => (
                        <label key={opt.value} style={{ display:"flex", alignItems:"center", gap:10,
                          padding:".65rem .9rem", border:`1px solid ${orderForm.paymentMethod===opt.value ? COLORS.blueDeep : COLORS.blueSoft}`,
                          borderRadius:8, cursor:"pointer", fontSize:13,
                          backgroundColor: orderForm.paymentMethod===opt.value ? COLORS.blueDeep+"11" : "transparent" }}>
                          <input type="radio" name="paymentMethod" value={opt.value}
                            checked={orderForm.paymentMethod===opt.value}
                            onChange={() => setOrderForm(f => ({ ...f, paymentMethod:opt.value }))}
                            style={{ accentColor: COLORS.blueDeep }} />
                          <span style={{ color: COLORS.blueDeep }}>{opt.icon}</span>
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Livraison à domicile */}
                {showDeliveryOptions && orderForm.deliveryMode === "home" && !hasBiscuiterie && (
                  <div>
                    <p className="text-[10px] tracked uppercase mb-3" style={{ color: COLORS.rust }}>Adresse de livraison</p>
                    {[
                      { label: "Adresse", key: "address", placeholder: "12 rue du Fournil" },
                      { label: "Ville", key: "city", placeholder: "Clermont-Ferrand" },
                      { label: "Code postal", key: "zip", placeholder: "63000" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} className="mb-4">
                        <label className="text-[10px] tracked uppercase" style={{ color: COLORS.inkSoft }}>{label}</label>
                        <input type="text" placeholder={placeholder} value={orderForm[key]}
                          onChange={e => setOrderForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full mt-2 pb-2 bg-transparent outline-none text-sm"
                          style={{ borderBottom: `1px solid ${COLORS.blue}`, fontFamily: "inherit" }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Chronopost pour biscuiterie */}
                {showDeliveryOptions && hasBiscuiterie && (
                  <div className="pt-2">
                    <p className="text-[10px] tracked uppercase mb-3" style={{ color: COLORS.rust }}>Adresse de livraison — Chronopost</p>
                    {[
                      { label: "Adresse", key: "address", placeholder: "12 rue du Fournil" },
                      { label: "Ville", key: "city", placeholder: "Clermont-Ferrand" },
                      { label: "Code postal", key: "zip", placeholder: "63000" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} className="mb-4">
                        <label className="text-[10px] tracked uppercase" style={{ color: COLORS.inkSoft }}>{label}</label>
                        <input type="text" placeholder={placeholder} value={orderForm[key]}
                          onChange={e => setOrderForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full mt-2 pb-2 bg-transparent outline-none text-sm"
                          style={{ borderBottom: `1px solid ${COLORS.blue}`, fontFamily: "inherit" }} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <button onClick={() => setOrderStep("cart")}
                    className="px-5 py-3 rounded-full text-xs tracked"
                    style={{ border: `1px solid ${COLORS.blueSoft}`, color: COLORS.inkSoft }}>
                    ← Retour
                  </button>
                  <button
                    disabled={orderLoading || !orderForm.nom || !orderForm.email || !postalOk}
                    onClick={async () => {
                      if (!orderForm.nom || !orderForm.email || !postalOk) return;
                      setOrderLoading(true);
                      try {
                        const items = Object.entries(cart).map(([id, qty]) => {
                          const item = allItems.find(i => i.id === id);
                          return { id, name: item?.name || id, price: item?.price || 0, qty };
                        });
                        const total = items.reduce((s, i) => s + i.price * i.qty, 0);
                        const pickup = pickupPoints.find(p => p.id===orderForm.pickupPointId);
                        let noteDetails = orderForm.note;
                        if (custPostal) noteDetails += ` | CP : ${custPostal}${custGeo ? " " + custGeo.city : ""}`;
                        if (pickup) noteDetails += ` | Retrait : ${pickup.name}${orderForm.timeSlotLabel ? " — " + orderForm.timeSlotLabel : ""}`;
                        if (orderForm.deliveryMode==="home" && orderForm.address) noteDetails += ` | Livraison : ${orderForm.address}, ${orderForm.zip} ${orderForm.city}`;
                        if (hasBiscuiterie) noteDetails += ` | Chronopost : ${orderForm.address}, ${orderForm.zip} ${orderForm.city}`;
                        const order = {
                          id: "cmd" + Date.now().toString(36),
                          name: orderForm.nom,
                          email: orderForm.email,
                          phone: orderForm.phone,
                          note: noteDetails,
                          status: "new",
                          shipping: hasBiscuiterie ? "chronopost" : orderForm.deliveryMode,
                          total: parseFloat(total.toFixed(2)),
                          items,
                          pickup_date: orderForm.pickupDate || null,
                          payment_method: orderForm.paymentMethod,
                        };
                        await sbFetch("orders", { method: "POST", body: JSON.stringify(order) });
                        try {
                          await fetch("/api/send-email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ order }),
                          });
                        } catch (e) { console.warn("Email non envoyé:", e); }
                        setOrderStep("done");
                        setCart({});
                        toast("Commande envoyée avec succès !", "success");
                      } catch (e) {
                        alert("Erreur lors de l'envoi, veuillez réessayer.");
                      } finally {
                        setOrderLoading(false);
                      }
                    }}
                    className="flex-1 py-3 rounded-full text-xs tracked uppercase"
                    style={{ backgroundColor: orderLoading ? COLORS.blue : COLORS.rust, color: COLORS.cream, opacity: (!orderForm.nom || !orderForm.email || !postalOk) ? 0.5 : 1 }}>
                    {orderLoading ? "Envoi…" : orderBlocked ? "Indisponible dans votre zone" : "Confirmer la commande"}
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 — Confirmation */}
            {orderStep === "done" && (
              <div className="text-center py-8">
                <HeartMark size={30} tone="rust" />
                <p style={{ fontFamily: FONT_DISPLAY, fontSize: "1.25rem", marginTop: "1rem" }}>
                  Commande reçue !
                </p>
                <p className="text-sm mt-3 leading-relaxed" style={{ color: COLORS.inkSoft }}>
                  Merci {orderForm.nom.split(" ")[0]} — nous revenons vers vous très vite pour confirmer et organiser la livraison.
                </p>
                <button onClick={() => { setCartOpen(false); setOrderStep("cart"); setOrderForm({ nom:"",email:"",phone:"",note:"",address:"",city:"",zip:"",deliveryMode:"pickup",pickupPointId:"",timeSlotId:"",timeSlotLabel:"",pickupDate:null,paymentMethod:"onsite_cb" }); }}
                  className="mt-8 px-6 py-3 rounded-full text-xs tracked uppercase"
                  style={{ backgroundColor: COLORS.blueDeep, color: COLORS.cream }}>
                  Fermer
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
