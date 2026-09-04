import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Sparkles,
  Send,
  Check,
  ShieldAlert,
  Scale
} from "lucide-react";

import "./CategoryResponse.css";

export default function CategoryResponse({
  category,
  comments = [],
  recommendation
}) {
  const navigate = useNavigate();

  const [selectedAction, setSelectedAction] = useState(
    recommendation?.action || "respond"
  );

  const [selectedTone, setSelectedTone] = useState(
    recommendation?.tone || "Calm & Professional"
  );

  const [selectedReply, setSelectedReply] = useState(null);

  const [applied, setApplied] = useState(false);

  const tones = [
    "Calm & Professional",
    "Empathetic",
    "Friendly",
    "Firm"
  ];

  const replies = [
    "Thank you for sharing your thoughts. We appreciate your feedback.",
    "We understand your perspective and appreciate you taking the time to comment.",
    "Thanks for engaging with our content. Your feedback helps us improve.",
    "We appreciate your feedback and hope you continue to follow our content.",
    "Thank you for taking the time to share your experience with us."
  ];

  const handleApply = async () => {
    if (selectedAction === "respond" && !selectedReply) {
      alert("Please select a response first.");
      return;
    }

    const payload = {
      category,
      action: selectedAction,
      tone: selectedTone,
      responseTemplate: selectedReply,
      commentIds: comments.map((comment) => comment.id)
    };

    try {
      const response = await fetch("http://localhost:5000/api/category-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to apply strategy");
      setApplied(true);
    } catch (err) {
      console.error(err);
      alert("Error applying strategy.");
    }
  };

  return (
    <section className="category-response">

      {/* HEADER */}
      <div className="category-header">
        <div>
          <span className="category-label">
            COMMENT CATEGORY
          </span>
          <h2>
            {category}
          </h2>
          <p>
            {comments.length} comments
          </p>
        </div>
        <div className="ai-label">
          <Sparkles size={14} />
          AI ANALYZED
        </div>
      </div>

      {/* NEW: COMMENT LIST */}
      <div className="category-comments-list" style={{ marginTop: '20px', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {comments.map((comment) => (
          <div key={comment.id} className="comment-card" style={{ padding: '15px', border: '1px solid #333', borderRadius: '8px', background: '#111' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong>@{comment.author || "Unknown"}</strong>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>
                {comment.publishedAt ? new Date(comment.publishedAt).toLocaleDateString() : ""}
              </span>
            </div>
            <p style={{ marginBottom: '15px' }}>{comment.text}</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
              <span style={{ background: '#222', padding: '4px 8px', borderRadius: '4px' }}>Likes: {comment.likeCount || 0}</span>
              <span style={{ background: '#222', padding: '4px 8px', borderRadius: '4px' }}>Toxicity: {comment.toxicity}/100</span>
              <span style={{ background: '#222', padding: '4px 8px', borderRadius: '4px' }}>Intent: {comment.intent}</span>
              {comment.analysis?.toxicity?.severity && (
                <span style={{ background: '#222', padding: '4px 8px', borderRadius: '4px', textTransform: 'capitalize' }}>
                  Severity: {comment.analysis.toxicity.severity}
                </span>
              )}
              {comment.analysis?.strategy?.recommended && (
                <span style={{ background: '#222', padding: '4px 8px', borderRadius: '4px' }}>
                  Strategy: {comment.analysis.strategy.recommended}
                </span>
              )}
              <button 
                onClick={() => navigate('/transform', { state: { comment } })}
                style={{ marginLeft: 'auto', background: '#444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={12} /> Analyze Comment
              </button>
            </div>
          </div>
        ))}
      </div>


      {/* AI RECOMMENDATION */}
      <div className="category-recommendation">
        <span className="category-label">
          AI RECOMMENDATION
        </span>
        <h3>
          {recommendation?.message ||
            "Respond to these comments constructively."}
        </h3>
        <p>
          {recommendation?.reason ||
            "These comments may benefit from creator engagement."}
        </p>
      </div>

      {/* ACTION */}
      <div className="category-section">
        <span className="category-label">
          WHAT SHOULD YOU DO?
        </span>
        <div className="category-options">
          <button
            className={
              selectedAction === "respond"
                ? "category-option selected"
                : "category-option"
            }
            onClick={() => {
              setSelectedAction("respond");
              setApplied(false);
            }}
          >
            <Sparkles size={17} />
            <span>Respond</span>
          </button>

          <button
            className={
              selectedAction === "ignore"
                ? "category-option selected"
                : "category-option"
            }
            onClick={() => {
              setSelectedAction("ignore");
              setApplied(false);
            }}
          >
            <ShieldAlert size={17} />
            <span>Ignore</span>
          </button>

          <button
            className={
              selectedAction === "legal"
                ? "category-option selected"
                : "category-option"
            }
            onClick={() => {
              setSelectedAction("legal");
              setApplied(false);
            }}
          >
            <Scale size={17} />
            <span>Legal Action</span>
          </button>
        </div>
      </div>

      {/* RESPOND FLOW */}
      {selectedAction === "respond" && (
        <>
          {/* TONE */}
          <div className="category-section">
            <span className="category-label">
              RESPONSE TONE
            </span>
            <p className="ai-tone">
              AI suggests:{" "}
              <strong>
                {recommendation?.tone || "Calm & Professional"}
              </strong>
            </p>
            <div className="category-options">
              {tones.map((tone) => (
                <button
                  key={tone}
                  className={
                    selectedTone === tone
                      ? "category-option selected"
                      : "category-option"
                  }
                  onClick={() => {
                    setSelectedTone(tone);
                    setSelectedReply(null);
                    setApplied(false);
                  }}
                >
                  {tone}
                  {tone === recommendation?.tone && <small>AI</small>}
                </button>
              ))}
            </div>
          </div>

          {/* RESPONSES */}
          <div className="category-section">
            <div className="responses-heading">
              <span className="category-label">
                AI GENERATED RESPONSES
              </span>
              <span>Choose one</span>
            </div>
            <div className="category-replies">
              {replies.map((reply, index) => (
                <button
                  key={index}
                  className={
                    selectedReply === reply
                      ? "category-reply selected"
                      : "category-reply"
                  }
                  onClick={() => {
                    setSelectedReply(reply);
                    setApplied(false);
                  }}
                >
                  <span className="reply-number">{index + 1}</span>
                  <p>{reply}</p>
                  {selectedReply === reply && <Check size={17} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* IGNORE */}
      {selectedAction === "ignore" && (
        <div className="category-notice">
          <ShieldAlert size={19} />
          <div>
            <strong>AI recommends not engaging</strong>
            <p>These comments will be left without a public response.</p>
          </div>
        </div>
      )}

      {/* LEGAL */}
      {selectedAction === "legal" && (
        <div className="category-notice legal">
          <Scale size={19} />
          <div>
            <strong>Flag for further review</strong>
            <p>These comments should be reviewed rather than publicly answered.</p>
          </div>
        </div>
      )}

      {/* APPLY */}
      <button className="apply-category" onClick={handleApply}>
        {applied ? (
          <>
            <Check size={17} />
            Strategy applied to {comments.length} comments
          </>
        ) : (
          <>
            <Send size={17} />
            {selectedAction === "respond"
              ? `Apply response strategy to ${comments.length} comments`
              : `Apply ${selectedAction} to ${comments.length} comments`}
          </>
        )}
      </button>

    </section>
  );
}