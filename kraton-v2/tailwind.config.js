export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
  safelist: [
    {pattern: /bg-(emerald|blue|yellow|orange|red|purple|indigo)-(400|500|600|700|800|900)/},
    {pattern: /text-(emerald|blue|yellow|orange|red|purple|indigo)-(400|500|600|700)/},
    {pattern: /border-(emerald|blue|yellow|orange|red|purple|indigo)-(500)/},
    {pattern: /from-(emerald|blue|yellow|orange|red|purple|indigo)-(600)/},
    {pattern: /to-(emerald|blue|yellow|orange|red|purple|indigo)-(800)/},
  ],
}
