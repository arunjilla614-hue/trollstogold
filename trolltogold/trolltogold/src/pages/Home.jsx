import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Home() {
    const navigate = useNavigate();
    const [videoUrl, setVideoUrl] = useState('');

  return (
    <div className="app">

      <nav className="navbar">
        <div className="logo">TROLLTOGOLD</div>

        <div className="nav-links">
          <a href="#">Dashboard</a>
          <a href="#">About</a>
        </div>
      </nav>

      <main className="hero">

        <p className="tagline">
          AI-POWERED SOCIAL MEDIA INTELLIGENCE
        </p>

        <h1>
          TURN TROLLS
          <br />
          INTO <span>GOLD ✨</span>
        </h1>

        <p className="description">
          Transform negative online interactions into
          positive engagement, creative content, and brand value.
        </p>

        <div className="url-section">

          <label htmlFor="video-url">
            Video URL
          </label>

          <div className="input-container">
            <input
              id="video-url"
              type="text"
              placeholder="Paste your YouTube video URL here..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />

            <button
              onClick={() => {
                if (videoUrl.trim() === '') {
                  alert('Please enter a YouTube video URL');
                  return;
                }
                // Pass the URL to Dashboard via navigation state
                navigate('/dashboard', { state: { videoUrl: videoUrl.trim() } });
              }}
            >
              ✨ Analyze Comments
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Home;