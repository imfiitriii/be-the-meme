import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Home from './pages/Home.jsx'
import Game from './pages/Game.jsx'
import GameOver from './pages/GameOver.jsx'
import TypingRace from './pages/TypingRace.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import MirrorMatch from './pages/MirrorMatch.jsx'
import BuildPose from './pages/BuildPose.jsx';
import AttractMode from './pages/AttractMode.jsx';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Routes where attract mode should NEVER fire (active gameplay)
  const ACTIVE_ROUTES = ["/game", "/mirror", "/typing"];
  const isActiveGame = ACTIVE_ROUTES.some(r => location.pathname.startsWith(r));

  useEffect(() => {
    // Don't set any timer while the user is actively playing
    if (isActiveGame) return;

    let timeout;

    function resetTimer() {
      clearTimeout(timeout);
      // Don't trigger attract mode if we're already on it
      if (location.pathname !== "/attract") {
        timeout = setTimeout(() => {
          navigate("/attract");
        }, 60000); // 60 seconds of inactivity
      }
    }

    // Set initial timer
    resetTimer();

    // Reset timer on any user interaction
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
    };
  }, [navigate, location.pathname, isActiveGame]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/attract" element={<AttractMode />} />
        <Route path="/game" element={<Game />} />
        <Route path="/gameover" element={<GameOver />} />
        <Route path="/typing" element={<TypingRace />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/mirror" element={<MirrorMatch />} />
        <Route path="/BuildPose" element={<BuildPose />} />
      </Routes>
    </>
  )
}

export default App

