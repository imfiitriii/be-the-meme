import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import Home from './pages/Home.jsx'
import Game from './pages/Game.jsx'
import BuildPose from './pages/BuildPose.jsx';
function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/BuildPose" element={<BuildPose />} />
      </Routes>
    </>
  )
}

export default App
