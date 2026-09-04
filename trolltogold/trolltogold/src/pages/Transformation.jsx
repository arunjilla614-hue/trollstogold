import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  Copy,
  Check,
  Scale,
  Loader,
  Volume2,
  AlertTriangle,
} from "lucide-react";

import "./Transformation.css";

// ─── Tone metadata ────────────────────────────────────────────
const TONE_META = {
  Witty:          { emoji: "😂", color: "#f59e0b", desc: "Clever & funny" },
  Sarcastic:      { emoji: "😏", color: "#a78bfa", desc: "Dry & clever" },
  Professional:   { emoji: "💼", color: "#60a5fa", desc: "Calm & confident" },
  Savage:         { emoji: "🔥", color: "#f87171", desc: "Bold comeback" },
  Kind:           { emoji: "❤️",  color: "#34d399", desc: "De-escalating" },
  "Clout Booster":{ emoji: "🚀", color: "#fbbf24", desc: "Engagement-first" },
};

export default function Transformation() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const comment   = location.state?.comment;

  useEffect(() => {
    if (!comment) navigate("/dashboard");
  }, [comment, navigate]);

  const analysis            = comment?.analysis || {};
  const recommendedStrategy = analysis?.strategy?.recommended || "kind_redirect";
  const severity            = analysis?.toxicity?.severity || "low";

  // ─── State ────────────────────────────────────────────────
  const [selectedAction, setSelectedAction] = useState(
    recommendedStrategy === "ignore" ? "ignore" : "respond"
  );
  const [suggestions, setSuggestions]   = useState([]);
  const [safetyNote,  setSafetyNote]    = useState(null);
  const [loading,     setLoading]       = useState(false);
  const [error,       setError]         = useState(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [copiedTone,  setCopiedTone]    = useState(null);
  const [speakingTone, setSpeakingTone] = useState(null);

  // ─── Fetch all 6 suggestions ONCE on mount ────────────────
  const fetchSuggestions = useCallback(async () => {
    if (!comment || selectedAction !== "respond") return;

    setLoading(true);
    setError(null);
    setHasAttempted(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const res = await fetch("http://localhost:5000/api/suggest-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment:          comment.text,
          toxicityScore:    analysis?.toxicity?.score,
          toxicitySeverity: analysis?.toxicity?.severity,
          intentType:       analysis?.intent?.type,
          author:           comment.author,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error: ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to generate suggestions");

      setSuggestions(data.data.suggestions);
      setSafetyNote(data.data.safetyNote);
    } catch (err) {
      if (err.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [comment, selectedAction, analysis]);

  // Only fetch when user switches to "respond" — not on every render
  useEffect(() => {
    if (selectedAction === "respond" && suggestions.length === 0 && !loading && !error && !hasAttempted) {
      fetchSuggestions();
    }
    if (selectedAction !== "respond") {
      setSuggestions([]);
      setSafetyNote(null);
      setHasAttempted(false);
      setError(null);
    }
  }, [selectedAction, suggestions.length, loading, error, hasAttempted, fetchSuggestions]);

  if (!comment) return null;

  // ─── Copy handler ─────────────────────────────────────────
  const handleCopy = async (text, tone) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTone(tone);
      setTimeout(() => setCopiedTone(null), 1800);
    } catch {
      alert("Unable to copy — please copy manually.");
    }
  };

  // ─── Text-to-speech ───────────────────────────────────────
  const handleSpeak = (text, tone) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (speakingTone === tone) {
        setSpeakingTone(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate  = 0.95;
      utterance.pitch = 1;
      utterance.onend = () => setSpeakingTone(null);
      setSpeakingTone(tone);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in this browser.");
    }
  };

  // ─── Gold score colour ────────────────────────────────────
  const goldColor = (score) =>
    score >= 80 ? "#fbbf24" : score >= 60 ? "#a3e635" : "#94a3b8";

  const actions = [
    { id: "respond", title: "Respond",       description: "Engage constructively",           Icon: Sparkles },
    { id: "ignore",  title: "Ignore",         description: "Don't engage with this comment",  Icon: ShieldAlert },
    { id: "legal",   title: "Legal Action",   description: "Flag for further review",          Icon: Scale },
  ];

  const overallGold =
    suggestions.length > 0
      ? Math.max(...suggestions.map((s) => s.goldScore))
      : analysis?.toxicity?.score
      ? Math.max(0, 100 - analysis.toxicity.score)
      : 50;

  return (
    <main className="transformation-page">

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div className="transformation-topbar">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={17} /> Dashboard
        </button>
        <div className="page-label">
          <Sparkles size={15} /> TROLLTOGOLD AI
        </div>
      </div>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <header className="transformation-title">
        <span>COMMENT TRANSFORMATION</span>
        <h1>Turn a comment into an action.</h1>
        <p>AI analyzes the comment and generates responses across 6 tones — all in one shot.</p>
      </header>

      {/* ── COMMENT CARD ────────────────────────────────────── */}
      <section className="transform-card comment-card">
        <div className="card-label">COMMENT</div>
        <div className="comment-content">
          <div className="comment-avatar">@{comment.author}</div>
          <p>"{comment.text}"</p>
        </div>
      </section>

      {/* ── ANALYSIS GRID ───────────────────────────────────── */}
      <section className="analysis-grid">
        <div className="analysis-item">
          <span>INTENT</span>
          <strong style={{ textTransform: "capitalize" }}>
            {analysis?.intent?.type?.replace(/_/g, " ") || "Unknown"}
          </strong>
        </div>
        <div className="analysis-item">
          <span>SEVERITY</span>
          <strong style={{ textTransform: "capitalize" }}>
            {severity}
          </strong>
        </div>
        <div className="analysis-item toxicity">
          <span>TOXICITY</span>
          <strong>
            {analysis?.toxicity?.score || 0}<small>/100</small>
          </strong>
          <div className="toxicity-line">
            <div style={{ width: `${analysis?.toxicity?.score || 0}%` }} />
          </div>
        </div>
      </section>

      {/* ── AI RECOMMENDATION ───────────────────────────────── */}
      <section className="recommendation-section">
        <div className="section-heading">
          <div>
            <span className="section-label">AI RECOMMENDATION</span>
            <h2>What should you do?</h2>
          </div>
          <div className="ai-badge"><Sparkles size={14} /> AI Suggested</div>
        </div>

        <div className="recommendation-box">
          <div className="recommendation-message">
            <div className="recommendation-icon"><Sparkles size={20} /></div>
            <div>
              <h3 style={{ textTransform: "capitalize" }}>
                {analysis?.strategy?.recommended?.replace(/_/g, " ") || "Respond"}
              </h3>
              <p>{analysis?.strategy?.reason || "Based on the content, you should respond appropriately."}</p>
            </div>
          </div>
        </div>

        <div className="action-options">
          {actions.map(({ id, title, description, Icon }) => (
            <button
              key={id}
              className={`action-option ${selectedAction === id ? "selected" : ""} ${
                (id === "ignore" && recommendedStrategy === "ignore") ||
                (id === "respond" && recommendedStrategy !== "ignore")
                  ? "ai-recommended"
                  : ""
              }`}
              onClick={() => setSelectedAction(id)}
            >
              <Icon size={19} />
              <div>
                <strong>{title}</strong>
                <span>{description}</span>
              </div>
              {((id === "ignore" && recommendedStrategy === "ignore") ||
                (id === "respond" && recommendedStrategy !== "ignore")) && (
                <em>AI</em>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── RESPOND FLOW ────────────────────────────────────── */}
      {selectedAction === "respond" && (
        <section className="responses-section">
          <div className="section-heading">
            <div>
              <span className="section-label">AI GENERATED RESPONSES</span>
              <h2>Choose your tone</h2>
            </div>
            {!loading && suggestions.length > 0 && (
              <span className="response-count">{suggestions.length} tones</span>
            )}
          </div>

          {/* Safety note banner */}
          {safetyNote && (
            <div className="safety-note">
              <AlertTriangle size={15} />
              <span>{safetyNote}</span>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <Loader size={32} className="spin-icon" />
              <p>Generating responses across all 6 tones via Featherless AI...</p>
              <small>This takes about 10–20 seconds</small>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } } .spin-icon { animation: spin 1s linear infinite; }`}</style>
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertTriangle size={20} />
              <p>{error}</p>
              <button className="retry-btn" onClick={fetchSuggestions}>
                Try Again
              </button>
            </div>
          ) : (
            <div className="tone-grid">
              {suggestions.map((suggestion) => {
                const meta = TONE_META[suggestion.tone] || { emoji: "✨", color: "#888", desc: "" };
                const isCopied = copiedTone === suggestion.tone;
                const isSpeaking = speakingTone === suggestion.tone;

                return (
                  <div
                    className="tone-card"
                    key={suggestion.tone}
                    style={{ "--tone-color": meta.color }}
                  >
                    {/* Card header */}
                    <div className="tone-card-header">
                      <div className="tone-badge">
                        <span className="tone-emoji">{suggestion.emoji || meta.emoji}</span>
                        <div>
                          <strong className="tone-name">{suggestion.tone}</strong>
                          <span className="tone-desc">{meta.desc}</span>
                        </div>
                      </div>
                      <div
                        className="gold-score-badge"
                        style={{ color: goldColor(suggestion.goldScore) }}
                      >
                        <Sparkles size={11} />
                        {suggestion.goldScore}/100
                      </div>
                    </div>

                    {/* Reply text */}
                    <p className="tone-reply">"{suggestion.reply}"</p>

                    {/* Actions */}
                    <div className="tone-actions">
                      <button
                        className={`tone-action-btn copy-btn ${isCopied ? "copied" : ""}`}
                        onClick={() => handleCopy(suggestion.reply, suggestion.tone)}
                        title="Copy reply"
                      >
                        {isCopied ? (
                          <><Check size={14} /> Copied!</>
                        ) : (
                          <><Copy size={14} /> Copy Reply</>
                        )}
                      </button>
                      <button
                        className={`tone-action-btn voice-btn ${isSpeaking ? "speaking" : ""}`}
                        onClick={() => handleSpeak(suggestion.reply, suggestion.tone)}
                        title="Play voice"
                      >
                        <Volume2 size={14} />
                        {isSpeaking ? "Stop" : "Play Voice"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── IGNORE ──────────────────────────────────────────── */}
      {selectedAction === "ignore" && (
        <section className="alternative-action">
          <ShieldAlert size={21} />
          <div>
            <strong>AI recommends not engaging</strong>
            <p>You have chosen to ignore this comment. No response will be generated.</p>
          </div>
        </section>
      )}

      {/* ── LEGAL ───────────────────────────────────────────── */}
      {selectedAction === "legal" && (
        <section className="alternative-action legal">
          <Scale size={21} />
          <div>
            <strong>Flag for legal review</strong>
            <p>The comment has been selected for further review rather than a public response.</p>
          </div>
        </section>
      )}

      {/* ── GOLD SCORE ──────────────────────────────────────── */}
      <section className="gold-score-section">
        <div>
          <span className="section-label">GOLD SCORE</span>
          <h2>How valuable is this interaction?</h2>
          <p>Based on toxicity, intent, engagement potential, response quality and brand safety.</p>
        </div>
        <div className="gold-score">
          <strong>{Math.round(overallGold)}</strong>
          <span>/100</span>
        </div>
      </section>

    </main>
  );
}