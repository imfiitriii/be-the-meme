import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import Home from './pages/Home.jsx'
import Game from './pages/Game.jsx'
import GameOver from './pages/GameOver.jsx'
import TypingRace from './pages/TypingRace.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import MirrorMatch from './pages/MirrorMatch.jsx'
import BuildPose from './pages/BuildPose.jsx';
function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
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

