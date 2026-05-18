// Shared leaderboard utility using localStorage
// Stores top 10 entries per game, sorted by score/wpm descending

const STORAGE_KEYS = {
    meme: "btm_leaderboard_meme",
    typing: "btm_leaderboard_typing",
    mirror: "btm_leaderboard_mirror",
};

export function getLeaderboard(game) {
    try {
        const data = localStorage.getItem(STORAGE_KEYS[game]);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function addEntry(game, entry) {
    // entry: { name, score, date } for meme, { name, wpm, accuracy, date } for typing
    const board = getLeaderboard(game);
    const sortKey = game === "typing" ? "wpm" : "score";

    const existingIndex = board.findIndex(e => e.name === entry.name);

    if (existingIndex !== -1) {
        // Only update existing entry if the new score is better
        if (entry[sortKey] > board[existingIndex][sortKey]) {
            board[existingIndex] = { ...entry, date: new Date().toISOString() };
        }
    } else {
        board.push({ ...entry, date: new Date().toISOString() });
    }

    // Sort by score (meme) or wpm (typing), descending
    board.sort((a, b) => b[sortKey] - a[sortKey]);

    // Keep top 10
    const trimmed = board.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS[game], JSON.stringify(trimmed));
    return trimmed;
}

export function isTopScore(game, value) {
    const board = getLeaderboard(game);
    const sortKey = game === "typing" ? "wpm" : "score";
    if (board.length < 10) return true;
    return value > board[board.length - 1][sortKey];
}
