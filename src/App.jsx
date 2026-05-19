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

  useEffect(() => {
    let timeout;
    
    function resetTimer() {
      clearTimeout(timeout);
      // Don't trigger attract mode if we're already on it
      if (location.pathname !== "/attract") {
        timeout = setTimeout(() => {
          navigate("/attract");
        }, 60000); // 60 seconds
      }
    }

    // Set initial timer
    resetTimer();

    // Listeners
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
  }, [navigate, location.pathname]);

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

