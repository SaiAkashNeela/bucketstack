/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.tsx",
        "./components/**/*.tsx",
        "./hooks/**/*.ts",
        "./services/**/*.ts",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                mono: ['Geist Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
            }
        }
    },
    plugins: [],
}
