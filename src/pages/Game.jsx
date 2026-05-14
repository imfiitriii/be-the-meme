import Button from "../components/Button";
import Background from "../components/Background";
import { useNavigate } from "react-router-dom";
export default function Game() {
    const navigate = useNavigate();
    return (
        <>
            <Background>
                <div className="flex flex-row justify-center items-center gap-7 h-screen animate-introFadeUp text-white">
                    <div className="bg-[#090a0f] w-[40%] h-[70%] rounded-4xl">
                        <img src="" alt="image" />
                    </div>
                    <div className="bg-[#090a0f] w-[40%] h-[70%] rounded-4xl">
                        camera
                        <img src="" alt="" />
                    </div>
                </div>
            </Background>
        </>
    )
}