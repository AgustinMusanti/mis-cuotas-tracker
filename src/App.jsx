import { useState, useEffect } from "react";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Supermercado",
  "Hogar",
  "Entretenimiento",
  "Salud y cuidado personal",
  "Indumentaria",
];

const CATEGORY_COLORS = {
  "Supermercado": "#16a34a",
  "Hogar": "#2563eb",
  "Entretenimiento": "#9333ea",
  "Salud y cuidado personal": "#0891b2",
  "Indumentaria": "#ea580c",
};

const CATEGORY_BG = {
  "Supermercado": "#f0fdf4",
  "Hogar": "#eff6ff",
  "Entretenimiento": "#faf5ff",
  "Salud y cuidado personal": "#ecfeff",
  "Indumentaria": "#fff7ed",
};

const CARD_PALETTE = [
  "#2563eb", "#0891b2", "#9333ea", "#16a34a",
  "#ea580c", "#db2777", "#0d9488", "#64748b",
];

// ─── Datos demo ───────────────────────────────────────────────────────────────

const DEMO_CARDS = [
  { id: "card1", name: "MercadoPago", issuer: "MercadoPago", closingDay: 18, color: "#2563eb", active: true },
  { id: "card2", name: "BBVA Visa", issuer: "BBVA", closingDay: 12, color: "#0891b2", active: true },
  { id: "card3", name: "Galicia Mastercard", issuer: "Galicia", closingDay: 25, color: "#9333ea", active: true },
];

const DEMO_PURCHASES = [
  { id: "demo1", description: "Proteína", amount: 20500, installments: 6, day: 10, month: 3, year: 2025, category: "Salud y cuidado personal", cardId: "card1" },
  { id: "demo2", description: "Almohada", amount: 20800, installments: 3, day: 22, month: 2, year: 2025, category: "Hogar", cardId: "card2" },
  { id: "demo3", description: "Supermercado", amount: 15400, installments: 1, day: 17, month: 3, year: 2025, category: "Supermercado", cardId: "card1" },
  { id: "demo4", description: "Afeitadora", amount: 35600, installments: 3, day: 25, month: 2, year: 2025, category: "Salud y cuidado personal", cardId: "card2" },
  { id: "demo5", description: "Auriculares", amount: 48000, installments: 6, day: 5, month: 3, year: 2025, category: "Entretenimiento", cardId: "card3" },
  { id: "demo6", description: "Zapatillas", amount: 62000, installments: 3, day: 28, month: 2, year: 2025, category: "Indumentaria", cardId: "card3" },
];

// ─── Utilidades ───────────────────────────────────────────────────────────────

function formatARS(amount) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

function monthLabel(year, month) {
  return new Date(year, month - 1, 1)
    .toLocaleString("es-AR", { month: "long", year: "numeric" });
}

function addMonths({ year, month }, n) {
  const total = year * 12 + (month - 1) + n;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

// Primer mes de impacto según el día de cierre de la tarjeta
function firstImpactMonth(purchase, closingDay) {
  const { day, month, year } = purchase;
  if (day <= closingDay) return { year, month };
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function getCuotaForMonth(purchase, closingDay, targetYear, targetMonth) {
  const first = firstImpactMonth(purchase, closingDay);
  for (let i = 0; i < purchase.installments; i++) {
    const m = addMonths(first, i);
    if (m.year === targetYear && m.month === targetMonth) {
      return { cuotaIndex: i + 1, total: purchase.installments, amount: purchase.amount / purchase.installments };
    }
  }
  return null;
}

// ─── Parser lenguaje natural ──────────────────────────────────────────────────

function parseNaturalInput(text) {
  const errors = [];

  let category = null;
  const catMatch = text.match(/categor[íi]a\s+(.+?)(?:\s*$)/i);
  if (catMatch) {
    const rawCat = catMatch[1].trim();
    const found = CATEGORIES.find(c => c.toLowerCase() === rawCat.toLowerCase());
    if (found) {
      category = found;
    } else {
      const partial = CATEGORIES.find(c =>
        c.toLowerCase().includes(rawCat.toLowerCase()) ||
        rawCat.toLowerCase().includes(c.toLowerCase().split(" ")[0])
      );
      category = partial || rawCat;
    }
  }

  let day = null, month = null, year = null;
  const dateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (dateMatch) {
    day = parseInt(dateMatch[1]);
    month = parseInt(dateMatch[2]);
    year = dateMatch[3]
      ? parseInt(dateMatch[3].length === 2 ? "20" + dateMatch[3] : dateMatch[3])
      : new Date().getFullYear();
  } else {
    errors.push("fecha (ej: 10/03)");
  }

  let installments = 1;
  const installMatch = text.match(/en\s+(\d+)\s+cuotas?/i);
  if (installMatch) installments = parseInt(installMatch[1]);

  let amount = null;
  const amountMatch = text.match(/\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+)\b/g);
  if (amountMatch) {
    const candidates = amountMatch
      .map(n => parseFloat(n.replace(/\./g, "").replace(",", ".")))
      .filter(n => !isNaN(n) && n > 100);
    if (candidates.length > 0) amount = Math.max(...candidates);
  }
  if (!amount) errors.push("monto (ej: 20500)");

  let description = text;
  if (catMatch) description = description.replace(catMatch[0], "");
  if (dateMatch) description = description.replace(dateMatch[0], "");
  description = description
    .replace(/en\s+\d+\s+cuotas?/i, "")
    .replace(/en\s+1\s+pago/i, "")
    .replace(/el\s+/i, "")
    .replace(/\b\d{4,}\b/g, "")
    .replace(/categor[íi]a/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!description || description.length < 2) errors.push("descripción");
  if (!category) errors.push("categoría");

  return { description, amount, installments, day, month, year, category, errors };
}

// ─── App principal ────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("gastos");

  const [cards, setCards] = useState(() => {
    try { const s = localStorage.getItem("mp-cards-v2"); return s ? JSON.parse(s) : DEMO_CARDS; }
    catch { return DEMO_CARDS; }
  });

  const [purchases, setPurchases] = useState(() => {
    try { const s = localStorage.getItem("mp-purchases-v2"); return s ? JSON.parse(s) : DEMO_PURCHASES; }
    catch { return DEMO_PURCHASES; }
  });

  useEffect(() => { try { localStorage.setItem("mp-cards-v2", JSON.stringify(cards)); } catch {} }, [cards]);
  useEffect(() => { try { localStorage.setItem("mp-purchases-v2", JSON.stringify(purchases)); } catch {} }, [purchases]);

  const activeCards = cards.filter(c => c.active);

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.headerLogo}>
            <div style={S.logoMark}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>💳</span>
            </div>
            <div>
              <h1 style={S.title}>MisCuotas</h1>
              <p style={S.subtitle}>Tus gastos en cuotas, siempre bajo control</p>
            </div>
          </div>
          <nav style={S.tabs}>
            <button
              style={{ ...S.tab, ...(tab === "gastos" ? S.tabActive : {}) }}
              onClick={() => setTab("gastos")}
            >
              Gastos
            </button>
            <button
              style={{ ...S.tab, ...(tab === "tarjetas" ? S.tabActive : {}) }}
              onClick={() => setTab("tarjetas")}
            >
              Tarjetas
              {cards.length > 0 && (
                <span style={S.tabBadge}>{cards.length}</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {tab === "gastos" ? (
        <GastosTab
          cards={activeCards}
          purchases={purchases}
          setPurchases={setPurchases}
          onGoToCards={() => setTab("tarjetas")}
        />
      ) : (
        <TarjetasTab
          cards={cards}
          setCards={setCards}
          purchases={purchases}
          setPurchases={setPurchases}
        />
      )}
    </div>
  );
}

// ─── Tab Gastos ───────────────────────────────────────────────────────────────

function GastosTab({ cards, purchases, setPurchases, onGoToCards }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [input, setInput] = useState("");
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || "");
  const [inputError, setInputError] = useState(null);
  const [inputSuccess, setInputSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (cards.length > 0 && !cards.find(c => c.id === selectedCardId)) {
      setSelectedCardId(cards[0].id);
    }
  }, [cards]);

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  }

  function getCardClosingDay(cardId) {
    return cards.find(c => c.id === cardId)?.closingDay || 18;
  }

  // Compras del mes con info de cuota
  const monthItems = purchases
    .map(p => {
      const card = cards.find(c => c.id === p.cardId);
      if (!card) return null;
      const cuota = getCuotaForMonth(p, card.closingDay, viewYear, viewMonth);
      if (!cuota) return null;
      return { purchase: p, cuota, card };
    })
    .filter(Boolean);

  const totalMonth = monthItems.reduce((acc, i) => acc + i.cuota.amount, 0);

  // Totales por tarjeta
  const cardTotals = {};
  monthItems.forEach(({ card, cuota }) => {
    cardTotals[card.id] = (cardTotals[card.id] || 0) + cuota.amount;
  });

  // Totales por categoría
  const categoryTotals = {};
  monthItems.forEach(({ purchase, cuota }) => {
    const cat = purchase.category || "Sin categoría";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + cuota.amount;
  });

  function handleAdd() {
    setInputError(null);
    setInputSuccess(false);
    if (!input.trim()) { setInputError("Escribí una compra antes de agregar."); return; }
    if (!selectedCardId) { setInputError("Seleccioná una tarjeta."); return; }
    const parsed = parseNaturalInput(input);
    if (parsed.errors.length > 0) {
      setInputError(`Falta información: ${parsed.errors.join(", ")}.`);
      return;
    }
    setPurchases(prev => [...prev, {
      id: Date.now().toString(),
      description: parsed.description,
      amount: parsed.amount,
      installments: parsed.installments,
      day: parsed.day,
      month: parsed.month,
      year: parsed.year,
      category: parsed.category,
      cardId: selectedCardId,
    }]);
    setInput("");
    setInputSuccess(true);
    setTimeout(() => setInputSuccess(false), 2500);
  }

  if (cards.length === 0) {
    return (
      <div style={S.main}>
        <div style={S.emptyCards}>
          <span style={{ fontSize: 48 }}>💳</span>
          <p style={S.emptyCardsTitle}>No tenés tarjetas cargadas</p>
          <p style={S.emptyCardsSub}>Primero tenés que cargar al menos una tarjeta para registrar gastos.</p>
          <button style={S.addBtn} onClick={onGoToCards}>Ir a Tarjetas</button>
        </div>
      </div>
    );
  }

  return (
    <main style={S.main}>
      {/* Input */}
      <section style={S.section}>
        <p style={S.sectionLabel}>Registrar compra</p>
        <textarea
          style={{
            ...S.textarea,
            borderColor: inputError ? "#ef4444" : inputSuccess ? "#22c55e" : "#e2e8f0",
            boxShadow: inputError ? "0 0 0 3px rgba(239,68,68,0.1)" : inputSuccess ? "0 0 0 3px rgba(34,197,94,0.1)" : "none",
          }}
          placeholder={`Ej: "Remeras 55300 en 3 cuotas el 05/03 categoría indumentaria"`}
          value={input}
          rows={2}
          onChange={e => { setInput(e.target.value); setInputError(null); }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
        />
        <div style={S.inputBottom}>
          <select
            style={S.cardSelect}
            value={selectedCardId}
            onChange={e => setSelectedCardId(e.target.value)}
          >
            {cards.map(c => (
              <option key={c.id} value={c.id}>{c.name} · cierre {c.closingDay}</option>
            ))}
          </select>
          <button style={S.addBtn} onClick={handleAdd}>Agregar</button>
        </div>
        {inputError && <p style={S.errorMsg}>⚠️ {inputError}</p>}
        {inputSuccess && <p style={S.successMsg}>✓ Compra registrada</p>}
        <p style={S.hint}>Categorías: {CATEGORIES.join(" · ")}</p>
      </section>

      {/* Resumen mensual */}
      <section style={S.section}>
        <div style={S.monthNav}>
          <button style={S.navBtn} onClick={prevMonth}>‹</button>
          <span style={S.monthLabelText}>{monthLabel(viewYear, viewMonth)}</span>
          <button style={S.navBtn} onClick={nextMonth}>›</button>
        </div>
        <div style={S.totalCard}>
          <span style={S.totalLabel}>Total a pagar</span>
          <span style={S.totalAmount}>{formatARS(totalMonth)}</span>
          <span style={S.totalSub}>{monthItems.length} cuota{monthItems.length !== 1 ? "s" : ""} este mes</span>
        </div>

        {/* Por tarjeta */}
        {Object.keys(cardTotals).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ ...S.sectionLabel, marginBottom: 8 }}>Por tarjeta</p>
            <div style={S.cardTotalsGrid}>
              {Object.entries(cardTotals).map(([cid, total]) => {
                const card = cards.find(c => c.id === cid);
                if (!card) return null;
                return (
                  <div key={cid} style={{ ...S.cardTotalItem, borderLeftColor: card.color }}>
                    <span style={{ ...S.cardTotalName, color: card.color }}>{card.name}</span>
                    <span style={S.cardTotalAmt}>{formatARS(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Lista del mes */}
      <section style={S.section}>
        <p style={S.sectionLabel}>Detalle del mes</p>
        {monthItems.length === 0 ? (
          <div style={S.emptyState}>
            <span style={{ fontSize: 36 }}>🎉</span>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>Sin gastos este mes</p>
          </div>
        ) : (
          <div style={S.list}>
            {monthItems.map(({ purchase, cuota, card }) => (
              <PurchaseCard
                key={purchase.id}
                purchase={purchase}
                cuota={cuota}
                card={card}
                onDelete={() => setDeleteConfirm(purchase.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Por categoría */}
      {Object.keys(categoryTotals).length > 0 && (
        <section style={S.section}>
          <p style={S.sectionLabel}>Por categoría</p>
          <div style={S.catGrid}>
            {Object.entries(categoryTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => (
                <div key={cat} style={{
                  ...S.catCard,
                  borderLeftColor: CATEGORY_COLORS[cat] || "#64748b",
                  background: CATEGORY_BG[cat] || "#f8fafc",
                }}>
                  <span style={{ ...S.catName, color: CATEGORY_COLORS[cat] || "#64748b" }}>{cat}</span>
                  <span style={S.catAmount}>{formatARS(total)}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      {deleteConfirm && (
        <ConfirmModal
          text="¿Eliminar esta compra y todas sus cuotas?"
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => { setPurchases(prev => prev.filter(p => p.id !== deleteConfirm)); setDeleteConfirm(null); }}
        />
      )}
    </main>
  );
}

function PurchaseCard({ purchase, cuota, card, onDelete }) {
  const color = CATEGORY_COLORS[purchase.category] || "#64748b";
  const bg = CATEGORY_BG[purchase.category] || "#f8fafc";
  return (
    <div style={{ ...S.card, borderLeftColor: card.color }}>
      <div style={S.cardMain}>
        <div style={S.cardHeader}>
          <span style={S.cardDesc}>{purchase.description}</span>
          <span style={{ ...S.catBadge, background: bg, color }}>{purchase.category}</span>
        </div>
        <div style={S.cardFooter}>
          <span style={{ ...S.cardChip, background: card.color + "18", color: card.color }}>
            {card.name}
          </span>
          <span style={S.cardCuota}>Cuota {cuota.cuotaIndex}/{cuota.total}</span>
          <span style={S.cardDate}>
            {String(purchase.day).padStart(2,"0")}/{String(purchase.month).padStart(2,"0")}/{purchase.year}
          </span>
          <span style={{ ...S.cardAmount, color: card.color }}>{formatARS(cuota.amount)}</span>
        </div>
      </div>
      <button style={S.trashBtn} onClick={onDelete}>×</button>
    </div>
  );
}

// ─── Tab Tarjetas ─────────────────────────────────────────────────────────────

function TarjetasTab({ cards, setCards, purchases, setPurchases }) {
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  function handleSave(card) {
    if (editCard) {
      setCards(prev => prev.map(c => c.id === card.id ? card : c));
    } else {
      setCards(prev => [...prev, { ...card, id: Date.now().toString() }]);
    }
    setShowForm(false);
    setEditCard(null);
  }

  function handleDelete(id) {
    setCards(prev => prev.filter(c => c.id !== id));
    setPurchases(prev => prev.filter(p => p.cardId !== id));
    setDeleteConfirm(null);
  }

  function handleToggleActive(id) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  }

  return (
    <main style={S.main}>
      <section style={S.section}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ ...S.sectionLabel, margin: 0 }}>Mis tarjetas</p>
          <button style={S.addBtn} onClick={() => { setEditCard(null); setShowForm(true); }}>
            + Nueva tarjeta
          </button>
        </div>

        {cards.length === 0 ? (
          <div style={S.emptyState}>
            <span style={{ fontSize: 36 }}>💳</span>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>No hay tarjetas cargadas todavía</p>
          </div>
        ) : (
          <div style={S.list}>
            {cards.map(card => {
              return (
                <div key={card.id} style={{ ...S.creditCard, borderLeftColor: card.color, opacity: card.active ? 1 : 0.55 }}>
                  <div style={S.creditCardLeft}>
                    <div style={{ ...S.creditCardDot, background: card.color }} />
                    <div>
                      <p style={S.creditCardName}>{card.name}</p>
                      <p style={S.creditCardSub}>
                        {card.issuer && <span>{card.issuer} · </span>}
                        Cierre día <strong>{card.closingDay}</strong>
                        {!card.active && <span style={S.inactiveBadge}>Inactiva</span>}
                      </p>
                    </div>
                  </div>
                  <div style={S.creditCardActions}>
                    <button style={S.iconBtn} title={card.active ? "Desactivar" : "Activar"} onClick={() => handleToggleActive(card.id)}>
                      {card.active ? "⏸" : "▶"}
                    </button>
                    <button style={S.iconBtn} title="Editar" onClick={() => { setEditCard(card); setShowForm(true); }}>✏️</button>
                    <button style={{ ...S.iconBtn, color: "#ef4444" }} title="Eliminar" onClick={() => setDeleteConfirm(card.id)}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showForm && (
        <CardFormModal
          initial={editCard}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditCard(null); }}
        />
      )}

      {deleteConfirm && (
        <ConfirmModal
          text={`¿Eliminar esta tarjeta? También se eliminarán las ${purchases.filter(p => p.cardId === deleteConfirm).length} compras asociadas.`}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
        />
      )}
    </main>
  );
}

// ─── Formulario de tarjeta ────────────────────────────────────────────────────

function CardFormModal({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [issuer, setIssuer] = useState(initial?.issuer || "");
  const [closingDay, setClosingDay] = useState(initial?.closingDay || 18);
  const [color, setColor] = useState(initial?.color || CARD_PALETTE[0]);
  const [error, setError] = useState(null);

  function handleSave() {
    if (!name.trim()) { setError("El nombre es obligatorio."); return; }
    const day = parseInt(closingDay);
    if (isNaN(day) || day < 1 || day > 31) { setError("El día de cierre debe estar entre 1 y 31."); return; }
    onSave({ id: initial?.id, name: name.trim(), issuer: issuer.trim(), closingDay: day, color, active: initial?.active ?? true });
  }

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={{ ...S.modal, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <p style={S.modalTitle}>{initial ? "Editar tarjeta" : "Nueva tarjeta"}</p>

        <label style={S.formLabel}>Nombre *</label>
        <input style={S.formInput} value={name} placeholder="Ej: MercadoPago" onChange={e => setName(e.target.value)} />

        <label style={S.formLabel}>Banco / Emisor (opcional)</label>
        <input style={S.formInput} value={issuer} placeholder="Ej: Galicia" onChange={e => setIssuer(e.target.value)} />

        <label style={S.formLabel}>Día de cierre *</label>
        <input style={S.formInput} type="number" min={1} max={31} value={closingDay} onChange={e => setClosingDay(e.target.value)} />

        <label style={S.formLabel}>Color</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {CARD_PALETTE.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 28, height: 28, borderRadius: "50%", background: c, border: "none",
                cursor: "pointer", outline: color === c ? `3px solid ${c}` : "none",
                outlineOffset: 2, transition: "outline 0.1s",
              }}
            />
          ))}
        </div>

        {error && <p style={{ ...S.errorMsg, marginBottom: 12 }}>⚠️ {error}</p>}

        <div style={S.modalBtns}>
          <button style={S.cancelBtn} onClick={onCancel}>Cancelar</button>
          <button style={{ ...S.addBtn, flex: 1 }} onClick={handleSave}>
            {initial ? "Guardar cambios" : "Agregar tarjeta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal confirmación ───────────────────────────────────────────────────────

function ConfirmModal({ text, onCancel, onConfirm }) {
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <p style={S.modalText}>{text}</p>
        <div style={S.modalBtns}>
          <button style={S.cancelBtn} onClick={onCancel}>Cancelar</button>
          <button style={S.deleteBtn} onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const S = {
  root: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", color: "#1e293b" },
  header: { background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 },
  headerInner: { maxWidth: 720, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  headerLogo: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: { width: 36, height: 36, borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.6px", color: "#0f172a" },
  subtitle: { margin: "1px 0 0", fontSize: 11, color: "#94a3b8", letterSpacing: "0.1px" },
  tabs: { display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4 },
  tab: { padding: "7px 16px", borderRadius: 7, border: "none", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#64748b", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s, color 0.15s" },
  tabActive: { background: "#fff", color: "#1e293b", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  tabBadge: { background: "#2563eb", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 700 },
  main: { maxWidth: 720, margin: "0 auto", padding: "24px 20px 60px", display: "flex", flexDirection: "column", gap: 20 },
  section: { background: "#fff", borderRadius: 16, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" },
  sectionLabel: { margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px" },
  textarea: { width: "100%", borderRadius: 10, border: "1.5px solid #e2e8f0", padding: "12px 14px", fontSize: 14, resize: "none", fontFamily: "inherit", color: "#1e293b", outline: "none", lineHeight: 1.5, boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s", display: "block" },
  inputBottom: { display: "flex", gap: 10, marginTop: 10 },
  cardSelect: { flex: 1, borderRadius: 10, border: "1.5px solid #e2e8f0", padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: "#1e293b", background: "#fff", outline: "none", cursor: "pointer" },
  addBtn: { background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", transition: "background 0.15s" },
  errorMsg: { margin: "8px 0 0", fontSize: 13, color: "#ef4444", fontWeight: 500 },
  successMsg: { margin: "8px 0 0", fontSize: 13, color: "#16a34a", fontWeight: 500 },
  hint: { margin: "10px 0 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.6 },
  monthNav: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  navBtn: { width: 38, height: 38, borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontFamily: "inherit" },
  monthLabelText: { fontSize: 17, fontWeight: 700, color: "#1e293b", textTransform: "capitalize" },
  totalCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "20px", background: "#eff6ff", borderRadius: 12, border: "1px solid #bfdbfe" },
  totalLabel: { fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.6px" },
  totalAmount: { fontSize: 34, fontWeight: 800, color: "#1d4ed8", letterSpacing: "-1px" },
  totalSub: { fontSize: 13, color: "#60a5fa" },
  cardTotalsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  cardTotalItem: { padding: "10px 12px", borderRadius: 10, borderLeft: "3px solid", background: "#f8fafc", display: "flex", flexDirection: "column", gap: 3 },
  cardTotalName: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" },
  cardTotalAmt: { fontSize: 15, fontWeight: 700, color: "#1e293b" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: { display: "flex", alignItems: "center", gap: 10, padding: "14px 14px 14px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "4px solid #64748b" },
  cardMain: { flex: 1, minWidth: 0 },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  cardDesc: { fontSize: 15, fontWeight: 600, color: "#1e293b" },
  catBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
  cardFooter: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardChip: { fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 },
  cardCuota: { fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 6, fontWeight: 500 },
  cardDate: { fontSize: 12, color: "#94a3b8" },
  cardAmount: { fontSize: 15, fontWeight: 700, marginLeft: "auto" },
  trashBtn: { width: 28, height: 28, borderRadius: 7, border: "1.5px solid #e2e8f0", background: "transparent", color: "#94a3b8", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "inherit", padding: 0, lineHeight: 1 },
  catGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  catCard: { padding: "12px 14px", borderRadius: 10, borderLeft: "4px solid", display: "flex", flexDirection: "column", gap: 3 },
  catName: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" },
  catAmount: { fontSize: 15, fontWeight: 700, color: "#1e293b" },
  creditCard: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 14px 14px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "4px solid" },
  creditCardLeft: { display: "flex", alignItems: "center", gap: 12 },
  creditCardDot: { width: 12, height: 12, borderRadius: "50%", flexShrink: 0 },
  creditCardName: { margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" },
  creditCardSub: { margin: "3px 0 0", fontSize: 12, color: "#64748b" },
  creditCardActions: { display: "flex", gap: 6, flexShrink: 0 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", color: "#475569", padding: 0 },
  inactiveBadge: { marginLeft: 6, fontSize: 10, fontWeight: 700, background: "#f1f5f9", color: "#94a3b8", padding: "1px 7px", borderRadius: 20 },
  emptyState: { textAlign: "center", padding: "32px 0" },
  emptyCards: { textAlign: "center", padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  emptyCardsTitle: { fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 },
  emptyCardsSub: { fontSize: 14, color: "#64748b", margin: 0, maxWidth: 320 },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#fff", borderRadius: 16, padding: "24px", width: "90%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" },
  modalTitle: { margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: "#1e293b" },
  modalText: { margin: "0 0 20px", fontSize: 15, fontWeight: 600, color: "#1e293b", textAlign: "center", lineHeight: 1.5 },
  modalBtns: { display: "flex", gap: 10 },
  cancelBtn: { flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#475569", fontFamily: "inherit" },
  deleteBtn: { flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  formLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" },
  formInput: { display: "block", width: "100%", borderRadius: 9, border: "1.5px solid #e2e8f0", padding: "10px 12px", fontSize: 14, fontFamily: "inherit", color: "#1e293b", outline: "none", marginBottom: 14, boxSizing: "border-box" },
};
