import { useState, useEffect, useCallback } from "react";

// ─── PALETTE (Whisper grey system) ───────────────────────────────────────────
const C = {
  bg:      "#F5F5F3",
  bg2:     "#EEEEEC",
  card:    "#FFFFFF",
  border:  "rgba(0,0,0,0.07)",
  border2: "rgba(0,0,0,0.12)",
  text:    "#1C1C1C",
  muted:   "#737373",
  muted2:  "#A3A3A3",
  dark:    "#1C1C1C",
};

const AREAS = [
  { key: "career",      label: "Career & Business",   icon: "💼", color: "#E8845C", desc: "Your satisfaction with your work, purpose, and professional growth" },
  { key: "finances",    label: "Finances",             icon: "💰", color: "#D4793F", desc: "Your financial security, income, savings, and relationship with money" },
  { key: "health",      label: "Health & Fitness",     icon: "🌿", color: "#4CAF80", desc: "Your physical wellbeing, energy levels, nutrition, and movement" },
  { key: "fun",         label: "Fun & Recreation",     icon: "✨", color: "#7C6BC4", desc: "Joy, play, hobbies, and activities that light you up" },
  { key: "environment", label: "Physical Environment", icon: "🏠", color: "#5B9BD5", desc: "Your living space, workspace, and surroundings" },
  { key: "growth",      label: "Personal Growth",      icon: "📚", color: "#E8845C", desc: "Learning, self-awareness, mindset, and spiritual development" },
  { key: "romance",     label: "Romance & Partner",    icon: "💕", color: "#C06B8A", desc: "Your romantic relationship or readiness for one" },
  { key: "social",      label: "Family & Friends",     icon: "👥", color: "#7C6BC4", desc: "Your relationships with family, friends, and community" },
];

const DEFAULT_SCORES = {};
AREAS.forEach(a => { DEFAULT_SCORES[a.key] = 5; });

// ─── AI ANALYSIS ─────────────────────────────────────────────────────────────
// Calls your Vercel API route at /api/analyse (which holds your Anthropic key)
async function fetchAIAnalysis(name, scores, avg, gap, highest3, lowest3) {
  const scoreLines = AREAS.map(a => `  ${a.label}: ${scores[a.key]}/10`).join("\n");
  const prompt = `You are a thoughtful life coach reviewing a Wheel of Life assessment. Be direct, specific, and genuinely useful. Never be generic. Honour high scores — someone scoring 8, 9, or 10 across the board is thriving and needs a different conversation than someone scoring 3s and 4s.

Here are ${name}'s scores:
${scoreLines}

Average: ${avg}/10
Balance gap (highest minus lowest): ${gap} points
Highest areas: ${highest3.map(a => `${a.label} (${scores[a.key]})`).join(", ")}
Lowest areas: ${lowest3.map(a => `${a.label} (${scores[a.key]})`).join(", ")}

Write a JSON response with exactly these four keys:

"pattern": 2-3 sentences. What does this overall pattern say about where ${name} is in life right now? Be specific to the actual numbers — don't treat a 8 as a problem area. If scores are generally high, acknowledge that genuinely and talk about what thriving at this level actually looks like.

"focus": 2-3 sentences. Given these specific scores, where is the most meaningful place to direct attention — and why? If all scores are high, the question shifts from "what's broken" to "what's the ceiling" or "what would 10 feel like". Be honest and non-obvious.

"connections": 3 sentences. How do these specific areas interact with each other? What tensions or synergies exist between the highest and lowest? Make this feel like insight, not a formula.

"prompts": An array of exactly 3 coaching questions. These should be genuinely thought-provoking, specific to ${name}'s actual pattern, and NOT generic. If someone scores 9 in Career and 8 in Fun, don't ask "what would a 10 in Fun look like" — go deeper. Make each question one they couldn't have Googled.

Return only valid JSON. No markdown, no preamble.`;

  const res = await fetch("/api/analyse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) throw new Error("API request failed");
  const data = await res.json();
  return data;
}

// ─── RADAR CHART ─────────────────────────────────────────────────────────────
function RadarChart({ scores }) {
  const vb = 520, cx = vb / 2, cy = vb / 2, maxR = 160, n = AREAS.length, labelOffset = 30;
  const getPoint = (index, value) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return { x: cx + (value / 10) * maxR * Math.cos(angle), y: cy + (value / 10) * maxR * Math.sin(angle) };
  };
  const getLabelPos = index => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return { x: cx + (maxR + labelOffset) * Math.cos(angle), y: cy + (maxR + labelOffset) * Math.sin(angle) };
  };
  const gridLines = [];
  for (let l = 1; l <= 10; l++) {
    const pts = AREAS.map((_, i) => { const p = getPoint(i, l); return `${p.x},${p.y}`; });
    gridLines.push(<polygon key={l} points={pts.join(" ")} fill="none" stroke={l % 5 === 0 ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.04)"} strokeWidth={l % 5 === 0 ? 1.2 : 0.7} />);
  }
  const dataPoints = AREAS.map((a, i) => getPoint(i, scores[a.key] || 0));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
  return (
    <svg width="100%" viewBox={`0 0 ${vb} ${vb}`} style={{ maxWidth: "480px", display: "block", margin: "0 auto" }}>
      {gridLines}
      {AREAS.map((_, i) => { const p = getPoint(i, 10); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(0,0,0,0.06)" strokeWidth="0.8" />; })}
      <path d={dataPath} fill="rgba(28,28,28,0.06)" stroke={C.dark} strokeWidth="2" strokeLinejoin="round" />
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill={AREAS[i].color} stroke="#fff" strokeWidth="2.5" />)}
      {AREAS.map((a, i) => {
        const p = getLabelPos(i);
        let anchor = "middle";
        if (p.x < cx - 15) anchor = "end";
        else if (p.x > cx + 15) anchor = "start";
        let dy = 0;
        if (p.y < cy - 80) dy = -4;
        else if (p.y > cy + 80) dy = 8;
        return (
          <g key={a.key}>
            <text x={p.x} y={p.y - 4 + dy} textAnchor={anchor} style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fill: C.text }}>{a.label}</text>
            <text x={p.x} y={p.y + 13 + dy} textAnchor={anchor} style={{ fontSize: "14px", fontFamily: "'Space Mono', monospace", fontWeight: 700, fill: a.color }}>{scores[a.key]}/10</text>
          </g>
        );
      })}
      <text x={cx} y={cy + 6} textAnchor="middle" style={{ fontSize: "26px", fontFamily: "'Playfair Display', serif", fontWeight: 800, fill: C.text }}>
        {(Object.values(scores).reduce((a, b) => a + b, 0) / AREAS.length).toFixed(1)}
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" style={{ fontSize: "9px", fontFamily: "'Space Mono', monospace", fontWeight: 700, fill: C.muted2, letterSpacing: "1.5px" }}>AVERAGE</text>
    </svg>
  );
}

// ─── SCORE SLIDER ─────────────────────────────────────────────────────────────
function ScoreSlider({ area, value, onChange }) {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div style={{ background: C.card, borderRadius: "14px", border: `1px solid ${C.border}`, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>{area.icon}</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: C.text }}>{area.label}</span>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "18px", fontWeight: 700, color: area.color, minWidth: "40px", textAlign: "right" }}>{value}</div>
      </div>
      <p style={{ fontSize: "12px", color: C.muted2, margin: "0 0 14px 30px", lineHeight: 1.4 }}>{area.desc}</p>
      <div style={{ position: "relative", padding: "0 2px", marginLeft: "30px" }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "6px", transform: "translateY(-50%)", borderRadius: "3px", background: C.bg2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: "3px", background: area.color, transition: "width 0.15s" }} />
        </div>
        <input type="range" min={1} max={10} value={value} onChange={e => onChange(parseInt(e.target.value))}
          style={{ width: "100%", appearance: "none", WebkitAppearance: "none", background: "transparent", cursor: "pointer", height: "24px", position: "relative", zIndex: 2 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginLeft: "30px", marginTop: "2px" }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <span key={n} style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", color: n <= value ? area.color : C.muted2, fontWeight: n === value ? 700 : 400, width: "10%", textAlign: "center" }}>{n}</span>
        ))}
      </div>
    </div>
  );
}

// ─── AI ANALYSIS DISPLAY ─────────────────────────────────────────────────────
function AIAnalysisSection({ analysis, loading, error }) {
  if (loading) return (
    <div style={{ marginTop: "28px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "36px 24px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: C.muted2, marginBottom: "16px" }}>COACHING ANALYSIS</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.muted2, animation: "pulse 1.2s ease-in-out infinite" }} />
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.muted2, animation: "pulse 1.2s ease-in-out 0.2s infinite" }} />
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.muted2, animation: "pulse 1.2s ease-in-out 0.4s infinite" }} />
      </div>
      <p style={{ fontSize: "13px", color: C.muted2, margin: "16px 0 0" }}>Reading your results and writing your coaching analysis...</p>
    </div>
  );

  if (error) return (
    <div style={{ marginTop: "28px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "24px" }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#E8845C", marginBottom: "8px" }}>ANALYSIS UNAVAILABLE</div>
      <p style={{ fontSize: "13px", color: C.muted, margin: 0, lineHeight: 1.6 }}>The AI coaching analysis couldn't load right now. Your scores and chart above are still accurate. Try refreshing the page or check your API configuration.</p>
    </div>
  );

  if (!analysis) return null;

  return (
    <div style={{ marginTop: "28px" }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: C.muted2, marginBottom: "14px" }}>COACHING ANALYSIS</div>

      {/* Pattern */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "24px 26px", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Your pattern</div>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", fontWeight: 400, color: C.text, margin: 0, lineHeight: 1.75 }}>{analysis.pattern}</p>
      </div>

      {/* Focus */}
      <div style={{ borderLeft: `3px solid ${C.dark}`, background: C.bg2, borderRadius: "0 12px 12px 0", padding: "22px 24px", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Where to focus</div>
        <p style={{ fontSize: "14px", color: C.text, margin: 0, lineHeight: 1.75 }}>{analysis.focus}</p>
      </div>

      {/* Connections */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "24px 26px", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: C.muted2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>How your areas connect</div>
        <p style={{ fontSize: "14px", color: C.text, margin: 0, lineHeight: 1.75 }}>{analysis.connections}</p>
      </div>

      {/* Prompts */}
      <div style={{ marginTop: "4px" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: C.muted2, marginBottom: "14px" }}>REFLECTION PROMPTS</div>
        {(analysis.prompts || []).map((q, i) => (
          <div key={i} style={{ border: `2px dashed ${["#E8845C","#4CAF80",C.dark][i]}`, borderRadius: "12px", padding: "16px 20px", background: `${["#E8845C","#4CAF80","#1C1C1C"][i]}0D`, marginBottom: "10px" }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.5 }}>{q}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RESULTS CTA FOOTER ───────────────────────────────────────────────────────
function ResultsCTAFooter() {
  return (
    <div style={{ background: C.dark, padding: "48px 20px 36px", marginTop: "48px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(0deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px)" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "560px", margin: "0 auto" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "20px", textAlign: "center" }}>WHAT'S NEXT FOR YOU</div>

        {/* The Circle */}
        <a href="https://dannybunny.co/circle" target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "22px 24px", marginBottom: "12px", textDecoration: "none", cursor: "pointer" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>The Circle</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>A dojo for personal sovereignty in the age of everything.</div>
          </div>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "18px", marginLeft: "16px", flexShrink: 0 }}>↗</span>
        </a>

        {/* In Your Pocket */}
        <a href="https://dannybunny.co/pocket" target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "22px 24px", textDecoration: "none", cursor: "pointer" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>Looking for 1-on-1 coaching?</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>In Your Pocket — coaching when life and business are actually happening.</div>
          </div>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "18px", marginLeft: "16px", flexShrink: 0 }}>↗</span>
        </a>

        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", textAlign: "center", margin: "24px 0 0" }}>
          A Circle member resource · dannybunny.co/circle
        </p>
      </div>
    </div>
  );
}

// ─── TREE ANIMATION ───────────────────────────────────────────────────────────
function TreeAnimation() {
  return (
    <svg width="160" height="180" viewBox="0 0 400 440" style={{ display: "block", margin: "0 auto 16px", overflow: "visible" }}>
      <defs>
        <radialGradient id="lg1" cx="40%" cy="35%"><stop offset="0%" stopColor="#5DB87A" /><stop offset="100%" stopColor="#3A8A55" /></radialGradient>
        <radialGradient id="lg2" cx="45%" cy="30%"><stop offset="0%" stopColor="#6DC48A" /><stop offset="100%" stopColor="#448F5C" /></radialGradient>
        <radialGradient id="tg" cx="50%" cy="0%"><stop offset="0%" stopColor="#8B6F4E" /><stop offset="100%" stopColor="#5C4433" /></radialGradient>
      </defs>
      <g style={{ animation: "treeFadeIn 1.2s ease-out forwards" }}>
        <path d="M192,380 C190,340 184,310 182,280 C180,260 178,240 180,220 C182,205 186,195 192,185 C195,180 198,178 200,175 C202,178 205,180 208,185 C214,195 218,205 220,220 C222,240 220,260 218,280 C216,310 210,340 208,380 Z" fill="url(#tg)" opacity="0.9" />
      </g>
      <g style={{ animation: "canopyGrow 1.4s ease-out 0.6s both", transformOrigin: "200px 160px" }}>
        <ellipse cx="155" cy="155" rx="52" ry="48" fill="url(#lg2)" opacity="0.7" />
        <ellipse cx="248" cy="152" rx="50" ry="46" fill="url(#lg2)" opacity="0.7" />
        <ellipse cx="200" cy="120" rx="48" ry="42" fill="url(#lg2)" opacity="0.65" />
      </g>
      <g style={{ animation: "canopyGrow 1.2s ease-out 0.9s both", transformOrigin: "200px 150px" }}>
        <ellipse cx="140" cy="160" rx="48" ry="40" fill="url(#lg1)" opacity="0.85"><animate attributeName="rx" values="48;50;48" dur="5s" repeatCount="indefinite" /></ellipse>
        <ellipse cx="260" cy="158" rx="46" ry="42" fill="url(#lg1)" opacity="0.85"><animate attributeName="rx" values="46;48;46" dur="5.5s" repeatCount="indefinite" /></ellipse>
        <ellipse cx="200" cy="100" rx="40" ry="35" fill="url(#lg2)" opacity="0.75"><animate attributeName="rx" values="40;42;40" dur="6.5s" repeatCount="indefinite" /></ellipse>
      </g>
      <g style={{ animation: "canopyGrow 0.8s ease-out 1.8s both", transformOrigin: "200px 140px" }}>
        {[{cx:125,cy:158,r:5,c:"#E8845C"},{cx:275,cy:155,r:5,c:"#D4793F"},{cx:148,cy:118,r:4.5,c:"#4CAF80"},{cx:255,cy:115,r:4.5,c:"#7C6BC4"},{cx:200,cy:78,r:4.5,c:"#E8845C"},{cx:200,cy:145,r:4,c:"#5B9BD5"}].map((d,i)=>(
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.c} opacity="0.9" style={{ animation:`gentlePulse ${3+i*0.3}s ease-in-out ${2+i*0.2}s infinite` }} />
        ))}
      </g>
    </svg>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function WheelOfLife() {
  const [phase, setPhase] = useState("welcome");
  const [name, setName] = useState("");
  const [scores, setScores] = useState({ ...DEFAULT_SCORES });
  const [currentArea, setCurrentArea] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, [phase]);

  // Trigger AI analysis when results phase loads
  useEffect(() => {
    if (phase !== "results") return;
    setAiLoading(true);
    setAiError(false);
    setAiAnalysis(null);
    const sorted = [...AREAS].sort((a, b) => scores[a.key] - scores[b.key]);
    const l3 = sorted.slice(0, 3);
    const h3 = sorted.slice(-3).reverse();
    const av = (Object.values(scores).reduce((a, b) => a + b, 0) / AREAS.length).toFixed(1);
    const gp = scores[h3[0]?.key] - scores[l3[0]?.key];
    fetchAIAnalysis(name, scores, av, gp, h3, l3)
      .then(data => { setAiAnalysis(data); setAiLoading(false); })
      .catch(() => { setAiError(true); setAiLoading(false); });
  }, [phase]);

  const avg = (Object.values(scores).reduce((a, b) => a + b, 0) / AREAS.length).toFixed(1);
  const sorted = [...AREAS].sort((a, b) => scores[a.key] - scores[b.key]);
  const lowest3 = sorted.slice(0, 3);
  const highest3 = sorted.slice(-3).reverse();
  const gap = scores[highest3[0]?.key] - scores[lowest3[0]?.key];
  const today = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

  const handleScore = (key, val) => setScores(prev => ({ ...prev, [key]: val }));

  const loadScript = src => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  const svgToImage = svgEl => new Promise(res => {
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });

  const downloadPDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const W = 210, margin = 18, cw = W - margin * 2;
      let y = 0;
      const hexRgb = h => { const c = h.replace("#",""); return [parseInt(c.substr(0,2),16),parseInt(c.substr(2,2),16),parseInt(c.substr(4,2),16)]; };

      // Dark header
      pdf.setFillColor(28,28,28); pdf.rect(0,0,W,44,"F");
      pdf.setTextColor(163,163,163); pdf.setFontSize(7); pdf.setFont("helvetica","bold");
      pdf.text("THE CIRCLE  ·  WHEEL OF LIFE ASSESSMENT", margin, 14);
      pdf.setTextColor(255,255,255); pdf.setFontSize(22);
      pdf.text(`${name}'s Results`, margin, 28);
      pdf.setTextColor(115,115,115); pdf.setFontSize(9); pdf.setFont("helvetica","normal");
      pdf.text(today, margin, 37);
      y = 50;

      // Radar chart
      const svgEl = document.querySelector(".results-radar-chart svg");
      if (svgEl) {
        const clone = svgEl.cloneNode(true); clone.setAttribute("width","600"); clone.setAttribute("height","600");
        const img = await svgToImage(clone);
        if (img) {
          const canvas = document.createElement("canvas"); canvas.width=1200; canvas.height=1200;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle="#F5F5F3"; ctx.fillRect(0,0,1200,1200);
          ctx.drawImage(img,0,0,1200,1200);
          const chartW = 120;
          pdf.addImage(canvas.toDataURL("image/png"),"PNG",(W-chartW)/2,y,chartW,chartW);
          y += chartW + 8;
        }
      }

      // Scores
      pdf.setTextColor(115,115,115); pdf.setFontSize(7); pdf.setFont("helvetica","bold");
      pdf.text("DETAILED SCORES", margin, y); y += 5;
      [...AREAS].sort((a,b)=>scores[b.key]-scores[a.key]).forEach(area => {
        const score = scores[area.key], [r,g,b_] = hexRgb(area.color);
        pdf.setFillColor(238,238,236); pdf.roundedRect(margin,y,cw,7,1.5,1.5,"F");
        const fw = Math.max(1,(score/10)*(cw-40));
        pdf.setFillColor(r,g,b_); pdf.roundedRect(margin,y,fw,7,1.5,1.5,"F");
        pdf.setTextColor(255,255,255); pdf.setFontSize(6.5); pdf.setFont("helvetica","bold");
        pdf.text(area.label, margin+3, y+4.8);
        pdf.setTextColor(r,g,b_); pdf.setFontSize(7.5);
        pdf.text(`${score}/10`, margin+cw-1, y+4.8, { align:"right" });
        y += 9;
      });
      y += 4;

      // Strengths / Growth / Metrics
      const colW = (cw-6)/3;
      [[highest3,"YOUR STRENGTHS",[76,175,128]],[lowest3,"GROWTH AREAS",[232,132,92]],[null,"KEY METRICS",[115,115,115]]].forEach(([arr,title,[r,g,b_]],ci) => {
        const cx_ = margin+(colW+3)*ci;
        pdf.setFillColor(255,255,255); pdf.roundedRect(cx_,y,colW,32,2,2,"F");
        pdf.setFillColor(r,g,b_); pdf.rect(cx_,y,colW,2,"F");
        pdf.setTextColor(r,g,b_); pdf.setFontSize(6); pdf.setFont("helvetica","bold");
        pdf.text(title,cx_+4,y+8);
        pdf.setTextColor(28,28,28); pdf.setFontSize(7.5); pdf.setFont("helvetica","normal");
        if (arr) arr.forEach((a,i)=>pdf.text(`${a.label}: ${scores[a.key]}/10`,cx_+4,y+14+i*6));
        else {
          pdf.text(`Average: ${avg}/10`,cx_+4,y+14);
          pdf.text(`Gap: ${gap} pts`,cx_+4,y+20);
          pdf.text(`Total: ${Object.values(scores).reduce((a,b)=>a+b,0)}/80`,cx_+4,y+26);
        }
      });
      y += 38;

      // AI Analysis in PDF (if loaded)
      if (aiAnalysis) {
        pdf.setFillColor(28,28,28); pdf.rect(margin,y,2,3,"F");
        pdf.setTextColor(115,115,115); pdf.setFontSize(7); pdf.setFont("helvetica","bold");
        pdf.text("COACHING ANALYSIS", margin+6, y+2); y += 7;

        const sections = [
          { label: "Your pattern", text: aiAnalysis.pattern },
          { label: "Where to focus", text: aiAnalysis.focus },
          { label: "How your areas connect", text: aiAnalysis.connections },
        ];
        sections.forEach(({ label, text }) => {
          pdf.setTextColor(115,115,115); pdf.setFontSize(6); pdf.setFont("helvetica","bold");
          pdf.text(label.toUpperCase(), margin, y); y += 4;
          pdf.setTextColor(28,28,28); pdf.setFontSize(8); pdf.setFont("helvetica","normal");
          const lines = pdf.splitTextToSize(text, cw);
          pdf.text(lines, margin, y);
          y += lines.length * 4 + 5;
        });

        if (aiAnalysis.prompts?.length) {
          pdf.setTextColor(115,115,115); pdf.setFontSize(7); pdf.setFont("helvetica","bold");
          pdf.text("REFLECTION PROMPTS", margin, y); y += 5;
          aiAnalysis.prompts.forEach((q, i) => {
            const [r,g,b_] = [[232,132,92],[76,175,128],[28,28,28]][i];
            pdf.setFillColor(r,g,b_); pdf.rect(margin,y,2,16,"F");
            pdf.setFillColor(255,255,255); pdf.roundedRect(margin+2,y,cw-2,16,0,0,"F");
            pdf.setTextColor(28,28,28); pdf.setFontSize(7.5); pdf.setFont("helvetica","bold");
            pdf.text(q, margin+6, y+5, { maxWidth: cw-12 });
            pdf.setDrawColor(220,220,218); pdf.setLineWidth(0.2);
            pdf.line(margin+6,y+12,margin+cw-6,y+12);
            y += 19;
          });
        }
      }

      // Footer
      y += 4;
      pdf.setDrawColor(200,200,198); pdf.setLineWidth(0.3); pdf.line(margin,y,W-margin,y); y += 5;
      pdf.setTextColor(163,163,163); pdf.setFontSize(7); pdf.setFont("helvetica","normal");
      pdf.text(`Wheel of Life  ·  The Circle  ·  ${today}  ·  dannybunny.co/circle`, W/2, y, { align:"center" });

      pdf.save(`Wheel-of-Life-${name||"Assessment"}.pdf`);
    } catch(err) {
      console.error(err);
      alert("PDF generation failed. Please try again.");
    }
    setPdfLoading(false);
  }, [name, scores, avg, gap, highest3, lowest3, today, aiAnalysis]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400;1,700&family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap');
    input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:#1C1C1C;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.18);cursor:pointer;transition:transform 0.15s}
    input[type="range"]::-webkit-slider-thumb:hover{transform:scale(1.2)}
    input[type="range"]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#1C1C1C;border:3px solid #fff;cursor:pointer}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes scaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
    @keyframes treeFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes canopyGrow{from{transform:scale(0.3) translateY(20px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
    @keyframes gentlePulse{0%,100%{opacity:0.85}50%{opacity:1}}
    @keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}
  `;

  // ── WELCOME ──
  if (phase === "welcome") return (
    <div style={{ minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif" }}>
      <style>{css}</style>
      <div style={{ background:C.dark,padding:"50px 20px 60px",textAlign:"center",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(90deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(0deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px)" }} />
        <div style={{ position:"relative",zIndex:1,maxWidth:"680px",margin:"0 auto" }}>
          <TreeAnimation />
          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:700,letterSpacing:"3px",textTransform:"uppercase",color:"rgba(255,255,255,0.35)",marginBottom:"12px" }}>THE CIRCLE · MEMBER RESOURCE</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:"36px",fontWeight:800,color:"#fff",margin:"0 0 8px",lineHeight:1.2 }}>
            Wheel of <em style={{ fontStyle:"italic",color:"rgba(255,255,255,0.55)" }}>Life</em>
          </h1>
          <p style={{ fontSize:"15px",color:"rgba(255,255,255,0.45)",margin:"12px auto 0",lineHeight:1.7,maxWidth:"460px" }}>
            Rate your satisfaction across 8 key life areas to reveal your balance, identify gaps, and discover where to focus next.
          </p>
        </div>
      </div>

      <div style={{ maxWidth:"480px",margin:"-30px auto 60px",padding:"0 20px",animation:animateIn?"fadeUp 0.5s ease forwards":"none",opacity:animateIn?1:0 }}>
        <div style={{ background:C.card,borderRadius:"16px",border:`1px solid ${C.border}`,padding:"36px 32px",boxShadow:"0 4px 20px rgba(0,0,0,0.06)" }}>
          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:C.muted2,marginBottom:"16px" }}>GET STARTED</div>
          <label style={{ fontSize:"14px",fontWeight:600,color:C.text,display:"block",marginBottom:"10px" }}>What's your name?</label>
          <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name"
            style={{ width:"100%",padding:"14px 16px",border:`1px solid ${C.border2}`,borderRadius:"10px",fontFamily:"'DM Sans',sans-serif",fontSize:"15px",color:C.text,background:C.bg,outline:"none",boxSizing:"border-box" }}
            onFocus={e=>e.target.style.borderColor=C.dark}
            onBlur={e=>e.target.style.borderColor=C.border2}
            onKeyDown={e=>e.key==="Enter"&&name.trim()&&setPhase("assess")} />
          <p style={{ fontSize:"12px",color:C.muted2,margin:"10px 0 24px",lineHeight:1.5 }}>Your name will appear on your personalised results and PDF download.</p>
          <button onClick={()=>{if(name.trim())setPhase("assess");}} disabled={!name.trim()}
            style={{ width:"100%",padding:"15px 36px",background:name.trim()?C.dark:"#E5E5E3",color:name.trim()?"#fff":C.muted2,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:"15px",border:"none",borderRadius:"50px",cursor:name.trim()?"pointer":"default",transition:"all 0.2s" }}>
            Begin Assessment →
          </button>
        </div>
        <div style={{ borderLeft:`3px solid ${C.dark}`,background:C.bg2,borderRadius:"0 12px 12px 0",padding:"18px 20px",marginTop:"20px" }}>
          <p style={{ fontFamily:"'Playfair Display',serif",fontSize:"15px",fontWeight:700,color:C.text,margin:0,lineHeight:1.6 }}>How it works</p>
          <p style={{ fontSize:"13px",color:C.muted,margin:"6px 0 0",lineHeight:1.7 }}>
            Rate your satisfaction from 1 to 10 across 8 life areas. No right or wrong answers — go with your gut. Your results include a visual wheel, an AI-written coaching analysis specific to your pattern, and a PDF to keep.
          </p>
        </div>
        <p style={{ fontSize:"11px",color:C.muted2,textAlign:"center",margin:"20px 0 0" }}>
          A Circle member resource · <a href="https://dannybunny.co/circle" style={{ color:C.muted,textDecoration:"none" }}>dannybunny.co/circle</a>
        </p>
      </div>
    </div>
  );

  // ── ASSESS ──
  if (phase === "assess") {
    const progress = ((currentArea + 1) / AREAS.length) * 100;
    return (
      <div style={{ minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif" }}>
        <style>{css}</style>
        <div style={{ background:C.dark,padding:"28px 20px 18px",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(90deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px)" }} />
          <div style={{ position:"relative",zIndex:1,maxWidth:"680px",margin:"0 auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px" }}>
              <span style={{ fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:"rgba(255,255,255,0.4)" }}>AREA {currentArea+1} OF {AREAS.length}</span>
              <span style={{ fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:700,letterSpacing:"1px",color:"rgba(255,255,255,0.25)" }}>{name.toUpperCase()}'S ASSESSMENT</span>
            </div>
            <div style={{ height:"4px",background:"rgba(255,255,255,0.08)",borderRadius:"2px",overflow:"hidden" }}>
              <div style={{ width:`${progress}%`,height:"100%",background:"#fff",borderRadius:"2px",transition:"width 0.4s" }} />
            </div>
          </div>
        </div>
        <div style={{ maxWidth:"680px",margin:"0 auto",padding:"28px 20px 40px",animation:animateIn?"fadeUp 0.4s ease forwards":"none",opacity:animateIn?1:0 }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:"26px",fontWeight:800,color:C.text,margin:"0 0 6px",textAlign:"center" }}>
            Rate Your <em style={{ color:AREAS[currentArea].color,fontStyle:"italic",fontWeight:700 }}>Satisfaction</em>
          </h2>
          <p style={{ textAlign:"center",fontSize:"14px",color:C.muted,margin:"0 0 28px" }}>How satisfied are you in this area right now? Be honest.</p>
          <ScoreSlider area={AREAS[currentArea]} value={scores[AREAS[currentArea].key]} onChange={val=>handleScore(AREAS[currentArea].key,val)} />
          <div style={{ display:"flex",gap:"6px",justifyContent:"center",margin:"28px 0 24px",flexWrap:"wrap" }}>
            {AREAS.map((a,i)=>(
              <button key={a.key} onClick={()=>{setCurrentArea(i);setAnimateIn(false);setTimeout(()=>setAnimateIn(true),30);}}
                style={{ width:"36px",height:"36px",borderRadius:"10px",border:i===currentArea?`2px solid ${a.color}`:`1px solid ${C.border}`,background:i===currentArea?`${a.color}18`:C.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",transition:"all 0.2s",position:"relative" }} title={a.label}>
                {a.icon}
                <span style={{ position:"absolute",bottom:"-2px",right:"-2px",width:"14px",height:"14px",borderRadius:"50%",background:a.color,color:"#fff",fontSize:"7px",fontFamily:"'Space Mono',monospace",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>{scores[a.key]}</span>
              </button>
            ))}
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",gap:"12px" }}>
            <button onClick={()=>{if(currentArea>0){setCurrentArea(p=>p-1);setAnimateIn(false);setTimeout(()=>setAnimateIn(true),30);}else setPhase("welcome");}}
              style={{ padding:"12px 24px",background:"transparent",color:C.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:"14px",border:"none",borderRadius:"10px",cursor:"pointer" }}>
              ← {currentArea>0?"Previous":"Back"}
            </button>
            <button onClick={()=>{if(currentArea<AREAS.length-1){setCurrentArea(p=>p+1);setAnimateIn(false);setTimeout(()=>setAnimateIn(true),30);}else setPhase("results");}}
              style={{ padding:"12px 32px",background:C.dark,color:"#fff",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:"15px",border:"none",borderRadius:"50px",cursor:"pointer",transition:"all 0.2s" }}>
              {currentArea<AREAS.length-1?"Next Area →":"See My Results →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  return (
    <div style={{ minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif" }}>
      <style>{css}</style>
      <div style={{ background:C.dark,padding:"40px 20px 50px",textAlign:"center",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(90deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(0deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px)" }} />
        <div style={{ position:"relative",zIndex:1,maxWidth:"680px",margin:"0 auto" }}>
          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:700,letterSpacing:"3px",textTransform:"uppercase",color:"rgba(255,255,255,0.35)",marginBottom:"12px" }}>THE CIRCLE · YOUR RESULTS</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:"32px",fontWeight:800,color:"#fff",margin:"0 0 6px",lineHeight:1.2 }}>
            {name}'s Wheel of <em style={{ fontStyle:"italic",color:"rgba(255,255,255,0.55)" }}>Life</em>
          </h1>
          <p style={{ fontSize:"13px",color:"rgba(255,255,255,0.35)",margin:"8px 0 0" }}>{today}</p>
        </div>
      </div>

      <div style={{ maxWidth:"680px",margin:"0 auto",padding:"0 20px 60px",animation:animateIn?"fadeUp 0.6s ease forwards":"none",opacity:animateIn?1:0 }}>

        {/* Radar */}
        <div className="results-radar-chart" style={{ background:C.card,borderRadius:"16px",border:`1px solid ${C.border}`,padding:"40px 20px 30px",marginTop:"-30px",boxShadow:"0 4px 20px rgba(0,0,0,0.06)",textAlign:"center",animation:animateIn?"scaleIn 0.6s ease 0.2s forwards":"none" }}>
          <RadarChart scores={scores} />
        </div>

        {/* Scores */}
        <div style={{ marginTop:"28px" }}>
          <div style={{ fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:C.muted2,marginBottom:"14px" }}>DETAILED SCORES</div>
          <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
            {[...AREAS].sort((a,b)=>scores[b.key]-scores[a.key]).map(area=>(
              <div key={area.key} style={{ background:C.card,borderRadius:"12px",border:`1px solid ${C.border}`,padding:"14px 18px",display:"flex",alignItems:"center",gap:"12px" }}>
                <span style={{ fontSize:"16px" }}>{area.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px" }}>
                    <span style={{ fontSize:"13px",fontWeight:600,color:C.text }}>{area.label}</span>
                    <span style={{ fontFamily:"'Space Mono',monospace",fontSize:"13px",fontWeight:700,color:area.color }}>{scores[area.key]}/10</span>
                  </div>
                  <div style={{ height:"5px",background:C.bg2,borderRadius:"3px",overflow:"hidden" }}>
                    <div style={{ width:`${scores[area.key]*10}%`,height:"100%",background:area.color,borderRadius:"3px",transition:"width 0.6s ease" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths / Growth */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginTop:"28px" }}>
          {[
            { title:"YOUR STRENGTHS", list:highest3, color:"#4CAF80" },
            { title:"GROWTH AREAS",   list:lowest3,  color:"#E8845C" },
          ].map(({title,list,color})=>(
            <div key={title} style={{ background:C.card,borderRadius:"14px",border:`1px solid ${C.border}`,borderLeft:`4px solid ${color}`,padding:"20px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace",fontSize:"9px",fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color,marginBottom:"12px" }}>{title}</div>
              {list.map((a,i)=>(
                <div key={a.key} style={{ display:"flex",alignItems:"center",gap:"8px",marginBottom:i<2?"8px":0 }}>
                  <span style={{ fontSize:"14px" }}>{a.icon}</span>
                  <span style={{ fontSize:"13px",fontWeight:500,color:C.text,flex:1 }}>{a.label}</span>
                  <span style={{ fontFamily:"'Space Mono',monospace",fontSize:"12px",fontWeight:700,color }}>{scores[a.key]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* AI Analysis — the beefy part */}
        <AIAnalysisSection analysis={aiAnalysis} loading={aiLoading} error={aiError} />

        {/* Action buttons */}
        <div style={{ display:"flex",gap:"12px",marginTop:"32px",flexWrap:"wrap",justifyContent:"center" }}>
          <button onClick={downloadPDF} disabled={pdfLoading||aiLoading}
            style={{ padding:"15px 36px",background:(pdfLoading||aiLoading)?"#E5E5E3":C.dark,color:(pdfLoading||aiLoading)?C.muted2:"#fff",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:"15px",border:"none",borderRadius:"50px",cursor:(pdfLoading||aiLoading)?"wait":"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:"8px" }}>
            {pdfLoading?"⏳ Generating PDF...":aiLoading?"⏳ Preparing analysis...":"📄 Download PDF"}
          </button>
          <button onClick={()=>{setPhase("assess");setCurrentArea(0);setAiAnalysis(null);}}
            style={{ padding:"15px 28px",background:"transparent",color:C.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:"14px",border:`2px solid ${C.border2}`,borderRadius:"50px",cursor:"pointer",transition:"all 0.2s" }}>
            ↩ Retake Assessment
          </button>
        </div>
      </div>

      <ResultsCTAFooter />
    </div>
  );
}
