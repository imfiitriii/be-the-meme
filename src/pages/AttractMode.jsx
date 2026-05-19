import Background from "../components/Background";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import MEME_CONFIG from "../data/memeConfig";

export default function AttractMode() {
    const navigate = useNavigate();

    // Any interaction goes to home
    useEffect(() => {
        function wakeUp() {
            navigate("/");
        }
        
        // Wait 1 second before attaching to prevent immediate wake up from the click that might have triggered a timeout
        const timeout = setTimeout(() => {
            window.addEventListener("click", wakeUp);
            window.addEventListener("keydown", wakeUp);
            window.addEventListener("touchstart", wakeUp);
            window.addEventListener("mousemove", wakeUp);
        }, 1000);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener("click", wakeUp);
            window.removeEventListener("keydown", wakeUp);
            window.removeEventListener("touchstart", wakeUp);
            window.removeEventListener("mousemove", wakeUp);
        };
    }, [navigate]);

    return (
        <Background>
            <div className="flex flex-col items-center justify-center h-screen w-full relative z-20 cursor-pointer overflow-hidden">
                <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />
                
                {/* Random floating memes in background */}
                {MEME_CONFIG.slice(0, 8).map((meme, i) => (
                    <img 
                        key={i} 
                        src={meme.image} 
                        alt="meme"
                        className="absolute opacity-20 object-contain w-32 h-32 animate-float pointer-events-none select-none"
                        style={{
                            top: `${Math.random() * 80 + 10}%`,
                            left: `${Math.random() * 80 + 10}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${Math.random() * 5 + 5}s`,
                            filter: "blur(2px)",
                            transform: `rotate(${Math.random() * 40 - 20}deg)`
                        }}
                    />
                ))}

                <div className="z-10 flex flex-col items-center">
                    <div className="bg-white/95 rounded-3xl px-8 py-4 mb-10 shadow-[0_0_60px_rgba(255,255,255,0.2)] animate-float">
                        <img src="/gdsc-logo.png" alt="GDSC UTP Logo" className="h-24 object-contain" />
                    </div>
                    
                    <img src="/cave-logo.png" alt="CAVE Youthnite Logo" className="h-64 object-contain animate-float" style={{ filter: "drop-shadow(0px 0px 40px rgba(255,255,255,0.2))" }} />
                    
                    <h2 className="text-4xl mt-12 font-black uppercase tracking-widest text-white/90"
                        style={{ animation: "pulseGlow 1.5s ease-in-out infinite", textShadow: "0 0 20px rgba(255,255,255,0.5)" }}>
                        Tap Anywhere To Play
                    </h2>
                </div>
            </div>
        </Background>
    );
}
