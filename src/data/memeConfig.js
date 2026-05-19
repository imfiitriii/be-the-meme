// Meme configuration — add new memes here.
// Poses are extracted automatically at runtime by the Game page.
// Only include high-quality photos with clearly visible human body poses.
const MEME_CONFIG = [
    { name: "Shocked",         image: "/assets/shocked.png" },      // 130KB
    { name: "Absolute Cinema", image: "/assets/cinema.png" },       // 172KB
    { name: "Pointing",        image: "/assets/pointing.png" },     // 656KB
    { name: "Hands Up!",       image: "/assets/arms_up.png" },      // 612KB
    { name: "Facepalm",        image: "/assets/facepalm.png" },     // 713KB
    { name: "IDK Shrug",       image: "/assets/shrug.png" },        // 680KB
    { name: "Confused",        image: "/assets/confused.png" },     // 34KB
    { name: "Siuuu",           image: "/assets/siuuu.png" },        // 63KB
    // Removed: 67.png (8KB icon), pointing_himself.png (11KB icon), tung.webp (15KB cartoon)
    // — these are too small/cartoonish for reliable pose matching
];

export default MEME_CONFIG;
