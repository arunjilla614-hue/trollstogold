import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  MessageCircle,
  Heart,
  Sparkles,
  ChevronRight,
  Loader
} from "lucide-react";

import CategoryResponse from "../components/CategoryResponse";
import "../components/CategoryResponse.css";
import "./Dashboard.css";

function getCategory(analysis) {
  if (!analysis) return "neutral";
  const label = analysis.toxicity?.label;
  if (label === "toxic" || label === "highly_toxic" || label === "mildly_toxic") {
    return "toxic";
  }
  if (analysis.intent?.type === "praise") {
    return "praise";
  }
  return "neutral";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoUrl = location.state?.videoUrl;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("toxic");

  useEffect(() => {
    if (!videoUrl) {
      navigate("/");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    const fetchAndAnalyze = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:5000/api/youtube/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // 20 comments = fast enough to stay under rate limits & timeout
          body: JSON.stringify({ videoUrl, maxComments: 20 }),
          signal: controller.signal,
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `API error: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.error?.message || "Failed to analyze comments");
        }

        const mappedComments = data.data.results.map((r) => ({
          id: r.comment.id,
          text: r.comment.text,
          author: r.comment.author,
          likeCount: r.comment.likeCount,
          publishedAt: r.comment.publishedAt,
          toxicity: r.analysis ? r.analysis.toxicity.score : 0,
          intent: r.analysis ? r.analysis.intent.type : "unknown",
          category: getCategory(r.analysis),
          analysis: r.analysis
        }));

        setComments(mappedComments);
      } catch (err) {
        if (err.name === "AbortError") {
          setError("Analysis timed out. The video may have too many comments. Please try again.");
        } else {
          setError(err.message);
        }
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    fetchAndAnalyze();
  }, [videoUrl, navigate]);

  /* -----------------------------
     CLASSIFY COMMENTS
  ----------------------------- */

  const toxicComments = useMemo(
    () => comments.filter((comment) => comment.category === "toxic"),
    [comments]
  );

  const neutralComments = useMemo(
    () => comments.filter((comment) => comment.category === "neutral"),
    [comments]
  );

  const praiseComments = useMemo(
    () => comments.filter((comment) => comment.category === "praise"),
    [comments]
  );

  const totalComments = comments.length;

  /* -----------------------------
     PERCENTAGES
  ----------------------------- */

  const toxicPercentage =
    totalComments === 0 ? 0 : Math.round((toxicComments.length / totalComments) * 100);

  const neutralPercentage =
    totalComments === 0 ? 0 : Math.round((neutralComments.length / totalComments) * 100);

  const praisePercentage =
    totalComments === 0 ? 0 : Math.round((praiseComments.length / totalComments) * 100);

  /* -----------------------------
     CATEGORY DATA
  ----------------------------- */

  const categories = [
    {
      id: "toxic",
      title: "Toxic",
      count: toxicComments.length,
      percentage: toxicPercentage,
      icon: AlertTriangle,
      comments: toxicComments,
      recommendation: {
        action: "respond",
        tone: "Calm & Professional",
        message: "Respond to these comments carefully.",
        reason:
          "These comments contain negative or potentially harmful language. A calm response can address genuine criticism without escalating the situation.",
      },
    },
    {
      id: "neutral",
      title: "Neutral",
      count: neutralComments.length,
      percentage: neutralPercentage,
      icon: MessageCircle,
      comments: neutralComments,
      recommendation: {
        action: "respond",
        tone: "Friendly",
        message: "Answer these comments helpfully.",
        reason:
          "These comments are generally neutral and may contain questions or requests for information.",
      },
    },
    {
      id: "praise",
      title: "Praises",
      count: praiseComments.length,
      percentage: praisePercentage,
      icon: Heart,
      comments: praiseComments,
      recommendation: {
        action: "respond",
        tone: "Friendly",
        message: "Engage with your supporters.",
        reason:
          "Positive interactions are an opportunity to strengthen your relationship with your audience.",
      },
    },
  ];

  const activeCategory = categories.find((category) => category.id === selectedCategory);

  // Dynamically calculate a fake gold score based on engagement
  const goldScore = totalComments > 0 ? Math.min(100, Math.round(50 + (praisePercentage * 0.5) + (toxicPercentage * 0.2))) : 0;

  if (loading) {
    return (
      <main className="dashboard-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader size={40} style={{ animation: 'spin 1s linear infinite' }} />
        <h2>Analyzing Comments...</h2>
        <p style={{ color: '#888' }}>Featherless AI is processing the video.</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <AlertTriangle size={40} color="#ff4444" />
        <h2>Error Analyzing Comments</h2>
        <p style={{ color: '#ff4444' }}>{error}</p>
        <button className="dashboard-back" style={{ marginTop: '1rem', background: '#333', color: '#fff', padding: '0.5rem 1rem', borderRadius: '4px' }} onClick={() => navigate(-1)}>
          Go Back
        </button>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav">
        <button className="dashboard-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={17} /> Back
        </button>
        <div className="dashboard-brand">
          <Sparkles size={16} /> TROLLTOGOLD
        </div>
        <div className="dashboard-status">
          <span /> AI ANALYSIS COMPLETE
        </div>
      </nav>

      <header className="dashboard-header">
        <span className="dashboard-eyebrow">COMMENT INTELLIGENCE</span>
        <h1>Your comments,<br /><span>turned into action.</span></h1>
        <p>TrollToGold analyzed your comment section and identified what deserves your attention first.</p>
      </header>

      <section className="toxic-priority">
        <div className="priority-heading">
          <div className="priority-title">
            <div className="priority-icon"><AlertTriangle size={20} /></div>
            <div>
              <span>HIGHEST PRIORITY</span>
              <h2>Toxic Comments</h2>
            </div>
          </div>
          <div className="priority-count">
            <strong>{toxicComments.length}</strong><span>comments</span>
          </div>
        </div>
        <div className="priority-content">
          <div>
            <p>TrollToGold detected <strong>{toxicComments.length} potentially toxic comments</strong> that may require attention.</p>
            <span className="priority-note">AI recommends reviewing these first.</span>
          </div>
          <button className="handle-toxic-button" onClick={() => setSelectedCategory("toxic")}>
            Review Toxic Comments <ChevronRight size={17} />
          </button>
        </div>
      </section>

      <section className="overview-section">
        <div className="section-top">
          <div>
            <span>COMMUNITY OVERVIEW</span>
            <h2>Comment breakdown</h2>
          </div>
          <span className="total-comments">{totalComments} total comments</span>
        </div>
        <div className="category-summary">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                className={`summary-card ${selectedCategory === category.id ? "active" : ""}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="summary-top">
                  <Icon size={17} />
                  <span>{category.percentage}%</span>
                </div>
                <strong>{category.count}</strong>
                <p>{category.title}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="category-section">
        <div className="category-tabs">
          {categories.map((category) => (
            <button
              key={category.id}
              className={selectedCategory === category.id ? "category-tab active" : "category-tab"}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.title}
              <span>{category.count}</span>
            </button>
          ))}
        </div>

        {activeCategory && (
          <CategoryResponse
            category={activeCategory.title}
            comments={activeCategory.comments}
            recommendation={activeCategory.recommendation}
          />
        )}
      </section>

      <section className="dashboard-gold">
        <div>
          <span>TROLLTOGOLD SCORE</span>
          <h2>Turn engagement into value.</h2>
          <p>Your Gold Score reflects the overall quality and opportunity within your comment section.</p>
        </div>
        <div className="dashboard-gold-number">
          <strong>{goldScore}</strong>
          <span>/100</span>
        </div>
      </section>
    </main>
  );
}