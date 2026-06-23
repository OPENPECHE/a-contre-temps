// ─────────────────────────────────────────────────────────────────────────────
// à contre-temps — Auth & Compte client
// Composant autonome à importer dans App.jsx
// ─────────────────────────────────────────────────────────────────────────────

const SB_URL = "https://jxxgafyqfbnqieiqltcn.supabase.co";
const SB_KEY = "sb_publishable_MdBMZ53hCDINWEu8jfsrzQ_sOeIuqZo";

import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(SB_URL, SB_KEY);

const C = {
  blueDeep: "#3E5A70", blue: "#7C97AC", blueSoft: "#D6DFE5",
  cream: "#F3E7DA", paper: "#FBF8F4", ink: "#2B2925",
  inkSoft: "rgba(43,41,37,0.55)", rust: "#A6713F",
};
const FD = "'Fraunces', serif";
const FB = "'Outfit', sans-serif";

import { useState, useEffect } from "react";
import { X, User, LogOut, ShoppingBag, Download, ChevronDown, ChevronUp } from "lucide-react";

// ── Hook Auth ────────────────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

// ── Modal Auth (login/inscription) ──────────────────────────────────────────
export function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true); setError("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email, password: form.password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: form.email, password: form.password,
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("clients").upsert({
            id: data.user.id, email: form.email,
            name: form.name, phone: form.phone,
          });
        }
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.message === "Invalid login credentials"
        ? "Email ou mot de passe incorrect."
        : e.message === "User already registered"
        ? "Un compte existe déjà avec cet email."
        : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(43,41,37,0.45)" }} onClick={onClose} />
      <div style={{ position:"relative", background:C.paper, borderRadius:14, padding:"2.5rem 2rem",
        width:"100%", maxWidth:360, fontFamily:FB }}>

        <button onClick={onClose} style={{ position:"absolute", top:16, right:16, border:"none",
          background:"transparent", cursor:"pointer" }}>
          <X size={18} color={C.inkSoft} />
        </button>

        <p style={{ fontFamily:FD, fontSize:22, marginBottom:4 }}>
          {mode === "login" ? "Se connecter" : "Créer un compte"}
        </p>
        <p style={{ fontSize:11, letterSpacing:".18em", color:C.inkSoft, marginBottom:"1.75rem" }}>
          À CONTRE-TEMPS
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
          {mode === "register" && (
            <Field label="Nom complet" value={form.name}
              onChange={v => setForm(f => ({ ...f, name:v }))} placeholder="Votre nom" />
          )}
          <Field label="Email" type="email" value={form.email}
            onChange={v => setForm(f => ({ ...f, email:v }))} placeholder="votre@email.fr" />
          {mode === "register" && (
            <Field label="Téléphone (optionnel)" type="tel" value={form.phone}
              onChange={v => setForm(f => ({ ...f, phone:v }))} placeholder="06 …" />
          )}
          <Field label="Mot de passe" type="password" value={form.password}
            onChange={v => setForm(f => ({ ...f, password:v }))} placeholder="••••••••"
            onEnter={handleSubmit} />
        </div>

        {error && <p style={{ color:C.rust, fontSize:12, marginTop:"0.75rem" }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ marginTop:"1.5rem", width:"100%", padding:".8rem",
            background:C.blueDeep, color:C.cream, border:"none", borderRadius:8,
            fontSize:12, letterSpacing:".12em", cursor:"pointer", opacity:loading?.6:1 }}>
          {loading ? "…" : mode === "login" ? "SE CONNECTER" : "CRÉER MON COMPTE"}
        </button>

        <p style={{ textAlign:"center", fontSize:12, color:C.inkSoft, marginTop:"1.25rem" }}>
          {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button onClick={() => { setMode(mode==="login"?"register":"login"); setError(""); }}
            style={{ border:"none", background:"transparent", color:C.blueDeep,
              cursor:"pointer", fontSize:12, textDecoration:"underline" }}>
            {mode === "login" ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type="text", placeholder, onEnter }) {
  return (
    <div>
      <label style={{ fontSize:10, letterSpacing:".14em", color:C.inkSoft }}>{label.toUpperCase()}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key==="Enter" && onEnter?.()}
        style={{ width:"100%", marginTop:6, paddingBottom:6, border:"none",
          borderBottom:`1px solid ${C.blue}`, background:"transparent",
          fontFamily:FB, fontSize:14, outline:"none", color:C.ink }} />
    </div>
  );
}

// ── Page Mon Compte ──────────────────────────────────────────────────────────
export function MonCompte({ user, onClose }) {
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("orders");
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editProfile, setEditProfile] = useState({});

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: p }] = await Promise.all([
        supabase.from("orders").select("*").eq("email", user.email).order("created_at", { ascending: false }),
        supabase.from("clients").select("*").eq("id", user.id).single(),
      ]);
      setOrders(o || []);
      setProfile(p || { email: user.email });
      setEditProfile(p || { email: user.email });
      setLoading(false);
    }
    load();
  }, [user]);

  async function saveProfile() {
    setSaving(true);
    await supabase.from("clients").upsert({ ...editProfile, id: user.id, email: user.email });
    setProfile(editProfile);
    setSaving(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    onClose();
  }

  const STATUSES = {
    new: { label:"Nouvelle", color:"#7C97AC" },
    confirmed: { label:"Confirmée", color:"#A6713F" },
    ready: { label:"Prête", color:"#4A7C59" },
    delivered: { label:"Livrée", color:"#7C97AC" },
    cancelled: { label:"Annulée", color:"#A63333" },
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex", justifyContent:"flex-end" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(43,41,37,0.4)" }} onClick={onClose} />
      <div style={{ position:"relative", background:C.paper, width:"100%", maxWidth:480,
        height:"100%", overflowY:"auto", padding:"2rem 1.75rem", fontFamily:FB }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.75rem" }}>
          <div>
            <p style={{ fontFamily:FD, fontSize:20 }}>Mon compte</p>
            <p style={{ fontSize:12, color:C.inkSoft, marginTop:2 }}>{user.email}</p>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <button onClick={logout} style={{ display:"flex", alignItems:"center", gap:5,
              padding:".45rem .85rem", border:`1px solid ${C.blueSoft}`, borderRadius:7,
              background:"transparent", cursor:"pointer", fontSize:11, color:C.inkSoft }}>
              <LogOut size={13} /> Déconnexion
            </button>
            <button onClick={onClose} style={{ border:"none", background:"transparent", cursor:"pointer" }}>
              <X size={18} color={C.inkSoft} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:6, marginBottom:"1.5rem" }}>
          {[
            { key:"orders", label:"Mes commandes", icon:<ShoppingBag size={13}/> },
            { key:"profile", label:"Mon profil", icon:<User size={13}/> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:".45rem .9rem",
                borderRadius:999, fontSize:11, letterSpacing:".1em", cursor:"pointer",
                border:`1px solid ${tab===t.key ? C.blueDeep : C.blueSoft}`,
                background: tab===t.key ? C.blueDeep : "transparent",
                color: tab===t.key ? C.cream : C.ink }}>
              {t.icon} {t.label.toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color:C.inkSoft, fontSize:13 }}>Chargement…</p>
        ) : tab === "orders" ? (
          <div>
            {orders.length === 0 ? (
              <p style={{ color:C.inkSoft, fontSize:13 }}>Aucune commande pour le moment.</p>
            ) : orders.map(o => {
              const s = STATUSES[o.status] || STATUSES.new;
              const items = Array.isArray(o.items) ? o.items : [];
              const open = expanded === o.id;
              return (
                <div key={o.id} style={{ border:`1px solid ${C.blueSoft}`, borderRadius:10,
                  marginBottom:8, overflow:"hidden" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:".85rem 1rem",
                    cursor:"pointer" }} onClick={() => setExpanded(open ? null : o.id)}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                        <span style={{ fontSize:13, fontWeight:500 }}>
                          {new Date(o.created_at).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })}
                        </span>
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:999, fontWeight:500,
                          background:s.color+"22", color:s.color }}>{s.label}</span>
                      </div>
                      <p style={{ fontSize:12, color:C.inkSoft }}>
                        {items.length} article{items.length>1?"s":""} · {Number(o.total).toFixed(2)} €
                      </p>
                    </div>
                    {open ? <ChevronUp size={14} color={C.inkSoft}/> : <ChevronDown size={14} color={C.inkSoft}/>}
                  </div>
                  {open && (
                    <div style={{ borderTop:`1px solid ${C.blueSoft}`, padding:".85rem 1rem",
                      background:"#f7f9fa" }}>
                      {items.map((it, i) => (
                        <div key={i} style={{ display:"flex", justifyContent:"space-between",
                          fontSize:12, padding:"3px 0" }}>
                          <span>{it.name} × {it.qty}</span>
                          <span style={{ color:C.inkSoft }}>{(it.price*it.qty).toFixed(2)} €</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between",
                        fontFamily:FD, fontSize:15, marginTop:8, paddingTop:8,
                        borderTop:`1px solid ${C.blueSoft}` }}>
                        <span>Total</span><span>{Number(o.total).toFixed(2)} €</span>
                      </div>
                      <button onClick={() => generateInvoicePDF(o)}
                        style={{ marginTop:10, display:"flex", alignItems:"center", gap:6,
                          padding:".45rem .9rem", border:`1px solid ${C.blueDeep}`,
                          borderRadius:7, background:"transparent", cursor:"pointer",
                          fontSize:11, color:C.blueDeep }}>
                        <Download size={12} /> Télécharger la facture
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
            {[
              { label:"Nom complet", key:"name", placeholder:"Votre nom" },
              { label:"Téléphone", key:"phone", placeholder:"06 …" },
              { label:"Adresse", key:"address", placeholder:"12 rue du Fournil" },
              { label:"Ville", key:"city", placeholder:"Clermont-Ferrand" },
              { label:"Code postal", key:"zip", placeholder:"63000" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize:10, letterSpacing:".14em", color:C.inkSoft }}>
                  {label.toUpperCase()}
                </label>
                <input value={editProfile[key]||""} placeholder={placeholder}
                  onChange={e => setEditProfile(p => ({ ...p, [key]:e.target.value }))}
                  style={{ width:"100%", marginTop:6, paddingBottom:6, border:"none",
                    borderBottom:`1px solid ${C.blue}`, background:"transparent",
                    fontFamily:FB, fontSize:14, outline:"none" }} />
              </div>
            ))}
            <button onClick={saveProfile} disabled={saving}
              style={{ marginTop:8, padding:".75rem", background:C.rust, color:C.cream,
                border:"none", borderRadius:8, fontSize:11, letterSpacing:".12em",
                cursor:"pointer", alignSelf:"flex-start", paddingLeft:"1.5rem", paddingRight:"1.5rem" }}>
              {saving ? "Sauvegarde…" : "ENREGISTRER"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Génération facture PDF simple ────────────────────────────────────────────
function generateInvoicePDF(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const date = new Date(order.created_at).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" });
  const invoiceNum = "ACT-" + order.id.toUpperCase().slice(-8);

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>
  body { font-family: Georgia, serif; color: #2B2925; max-width: 600px; margin: 40px auto; padding: 0 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 1px solid #D6DFE5; padding-bottom: 20px; }
  .brand { font-size: 22px; font-style: italic; }
  .sub { font-size: 10px; letter-spacing: .18em; color: #888; margin-top: 4px; }
  h2 { font-size: 14px; letter-spacing: .12em; color: #7C97AC; margin: 0 0 4px; }
  .info { font-size: 13px; color: #555; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th { text-align: left; font-size: 10px; letter-spacing: .14em; color: #888; border-bottom: 1px solid #D6DFE5; padding: 6px 0; }
  td { font-size: 13px; padding: 8px 0; border-bottom: 1px solid #F0F0F0; }
  .total-row td { font-size: 15px; font-weight: bold; border-top: 1px solid #2B2925; border-bottom: none; padding-top: 12px; }
  .footer { font-size: 11px; color: #888; margin-top: 40px; border-top: 1px solid #D6DFE5; padding-top: 16px; }
</style></head><body>
<div class="header">
  <div>
    <div class="brand">à contre-temps</div>
    <div class="sub">FOURNIL VIVANT</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:11px;letter-spacing:.14em;color:#888">FACTURE</div>
    <div style="font-size:16px;font-weight:bold;margin-top:4px">${invoiceNum}</div>
    <div style="font-size:12px;color:#888;margin-top:2px">${date}</div>
  </div>
</div>
<div style="margin-bottom:24px">
  <h2>FACTURER À</h2>
  <div class="info">${order.name}<br>${order.email}${order.phone ? "<br>" + order.phone : ""}</div>
</div>
<table>
  <thead><tr><th>ARTICLE</th><th style="text-align:center">QTÉ</th><th style="text-align:right">PRIX U.</th><th style="text-align:right">TOTAL</th></tr></thead>
  <tbody>
    ${items.map(it => `<tr><td>${it.name}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">${Number(it.price).toFixed(2)} €</td><td style="text-align:right">${(it.price*it.qty).toFixed(2)} €</td></tr>`).join("")}
    <tr class="total-row"><td colspan="3">Total TTC</td><td style="text-align:right">${Number(order.total).toFixed(2)} €</td></tr>
  </tbody>
</table>
<div class="footer">à contre-temps — Fournil vivant · fournilvivant.fr · acontretemps@fournilvivant.fr<br>Auto-entrepreneur — TVA non applicable, art. 293 B du CGI</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `facture-${invoiceNum}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
