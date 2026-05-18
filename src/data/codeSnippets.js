// Code snippets for the typing race — mix of languages, all short enough for a 60s round
const CODE_SNIPPETS = [
    {
        title: "Hello World",
        language: "python",
        code: `def hello():\n    print("Hello, GDSC!")\n    return True`,
    },
    {
        title: "Fibonacci",
        language: "javascript",
        code: `function fib(n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}`,
    },
    {
        title: "Array Sum",
        language: "python",
        code: `nums = [1, 2, 3, 4, 5]\ntotal = sum(nums)\nprint(f"Sum: {total}")`,
    },
    {
        title: "React Component",
        language: "jsx",
        code: `export default function App() {\n  const [count, setCount] = useState(0);\n  return <button>{count}</button>;\n}`,
    },
    {
        title: "Binary Search",
        language: "python",
        code: `def search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid`,
    },
    {
        title: "Fetch API",
        language: "javascript",
        code: `async function getData(url) {\n  const res = await fetch(url);\n  const data = await res.json();\n  return data;\n}`,
    },
    {
        title: "CSS Grid",
        language: "css",
        code: `.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n  padding: 24px;\n}`,
    },
    {
        title: "Map & Filter",
        language: "javascript",
        code: `const nums = [1, 2, 3, 4, 5, 6];\nconst even = nums.filter(n => n % 2 === 0);\nconst doubled = even.map(n => n * 2);`,
    },
];

export default CODE_SNIPPETS;
