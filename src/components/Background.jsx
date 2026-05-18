import { Children } from "react";

export default function Background({ children }) {

    function generateBoxShadow(count, width, height) {
        let shadows = [];

        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            shadows.push(`${x}px ${y}px #fff`);
        }

        return shadows.join(", ");
    }
    const STAR_1 = generateBoxShadow(400, 2000, 2000);
    const STAR_2 = generateBoxShadow(250, 2000, 2000);
    const STAR_3 = generateBoxShadow(120, 2000, 2000);
    return (
        <div className="relative w-full h-full overflow-hidden bg-[radial-gradient(ellipse_at_bottom,#1b2735_0%,#090a0f_100%)]">

            {/* Stars Layer 1 */}
            <div
                id="stars"
                className="absolute top-0 left-0 w-[1px] h-[1px] bg-transparent animate-animStar50"
                style={{ boxShadow: STAR_1 }}
            />

            {/* Stars Layer 2 */}
            <div
                id="stars2"
                className="absolute top-0 left-0 w-[2px] h-[2px] bg-transparent animate-animStar100"
                style={{ boxShadow: STAR_2 }}
            />

            {/* Stars Layer 3 */}
            <div
                id="stars3"
                className="absolute top-0 left-0 w-[3px] h-[3px] bg-transparent animate-animStar150"
                style={{ boxShadow: STAR_3 }}
            />

            {/* GDSC color horizon glow */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EA4335] via-[#4285F4] via-50% via-[#FBBC04] to-[#34A853] opacity-70 z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#090a0f]/60 to-transparent pointer-events-none z-10" />

            {children}
        </div>
    );
}