import Button from "../components/Button";
import Background from "../components/Background";
import { useNavigate } from "react-router-dom";
export default function Home() {
    const navigate = useNavigate();
    return (
        <>
            <Background>
                <div className="flex flex-col justify-center items-center gap-7 h-screen animate-introFadeUp text-white">
                    <h1 className="text-8xl font-bold">Be The Meme!</h1>
                    <p className="text-2xl">Do meme gestures to get points</p>
                    <Button onClick={()=>navigate("/game")}>START</Button>
                </div>
            </Background>
        </>
    )
}