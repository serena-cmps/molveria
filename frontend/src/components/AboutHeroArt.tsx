// Purely decorative diagram from the approved design — no copy lives here, so it's
// injected verbatim rather than hand-transcribed into JSX (guarantees pixel parity).
// Keyframes are embedded + uniquely named (see HeroRingsArt for why).
const svg = `
<style>
  @keyframes aboutPulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.16)}}
</style>
<svg viewBox="0 0 620 560" style="width:520px;height:auto;flex:none;overflow:visible">
  <defs><radialGradient id="glowNode" cx="40%" cy="35%"><stop offset="0" stop-color="#ffffff"></stop><stop offset="55%" stop-color="#8fe9ff"></stop><stop offset="100%" stop-color="#1d7f9c"></stop></radialGradient></defs>
  <g transform="rotate(-20 310 300)" fill="none" stroke-linecap="round">
    <g stroke="#3fe0ff" stroke-width="1.2" opacity=".9" style="filter:drop-shadow(0 0 6px rgba(63,224,255,.75))">
      <path d="M100 252 A 40 48 0 0 0 100 348"></path>
      <path d="M100 252 L250 252 M100 348 L250 348"></path>
      <ellipse cx="100" cy="300" rx="15" ry="48" opacity=".5"></ellipse>
      <ellipse cx="150" cy="300" rx="15" ry="48" opacity=".5"></ellipse>
      <ellipse cx="200" cy="300" rx="15" ry="48" opacity=".5"></ellipse>
      <ellipse cx="250" cy="300" rx="17" ry="48"></ellipse>
      <path d="M100 300 L250 300" opacity=".35" stroke-dasharray="3 6"></path>
      <path d="M100 252 L150 300 L200 252 L250 300 M100 348 L150 300 L200 348 L250 300" opacity=".55" stroke-width="1"></path>
      <path d="M125 258 L150 252 M175 342 L200 348" opacity=".3" stroke-width="1"></path>
    </g>
    <g transform="rotate(17 330 300) translate(56 -16)" stroke="#3fe0ff" stroke-width="1.2" opacity=".9" style="filter:drop-shadow(0 0 6px rgba(63,224,255,.75))">
      <path d="M480 252 A 40 48 0 0 1 480 348"></path>
      <path d="M330 252 L480 252 M330 348 L480 348"></path>
      <ellipse cx="330" cy="300" rx="17" ry="48"></ellipse>
      <ellipse cx="380" cy="300" rx="15" ry="48" opacity=".5"></ellipse>
      <ellipse cx="430" cy="300" rx="15" ry="48" opacity=".5"></ellipse>
      <ellipse cx="480" cy="300" rx="15" ry="48" opacity=".5"></ellipse>
      <path d="M330 300 L480 300" opacity=".35" stroke-dasharray="3 6"></path>
      <path d="M330 300 L380 252 L430 300 L480 252 M330 300 L380 348 L430 300 L480 348" opacity=".55" stroke-width="1"></path>
    </g>
    <g fill="#04060b" stroke="#6f9dc4" stroke-width="1.2">
      <circle cx="100" cy="252" r="4"></circle><circle cx="150" cy="252" r="4"></circle><circle cx="200" cy="252" r="4"></circle>
      <circle cx="100" cy="348" r="4"></circle><circle cx="150" cy="348" r="4"></circle><circle cx="200" cy="348" r="4"></circle>
      <circle cx="150" cy="300" r="3.4"></circle><circle cx="200" cy="300" r="3.4"></circle>
    </g>
    <g fill="url(#glowNode)" style="filter:drop-shadow(0 0 12px #3fe0ff)">
      <circle cx="250" cy="252" r="6"></circle><circle cx="250" cy="348" r="6"></circle><circle cx="250" cy="300" r="5"></circle>
      <circle cx="60" cy="300" r="5"></circle>
    </g>
    <g transform="rotate(17 330 300) translate(56 -16)" fill="url(#glowNode)" style="filter:drop-shadow(0 0 12px #3fe0ff)">
      <circle cx="330" cy="252" r="6"></circle><circle cx="330" cy="348" r="6"></circle><circle cx="330" cy="300" r="5"></circle>
    </g>
    <g transform="rotate(17 330 300) translate(56 -16)" fill="#04060b" stroke="#6f9dc4" stroke-width="1.2">
      <circle cx="380" cy="252" r="4"></circle><circle cx="430" cy="252" r="4"></circle><circle cx="480" cy="252" r="4"></circle>
      <circle cx="380" cy="348" r="4"></circle><circle cx="430" cy="348" r="4"></circle><circle cx="480" cy="348" r="4"></circle>
      <circle cx="430" cy="300" r="3.4"></circle>
    </g>
    <g stroke="#3fe0ff" opacity=".22" stroke-width="1" stroke-dasharray="2 8" fill="none">
      <path d="M262 296 C 282 292 292 300 300 300"></path>
      <path d="M264 274 C 296 258 312 244 330 232"></path>
      <path d="M266 320 C 284 344 292 360 300 375"></path>
      <path d="M334 226 C 350 206 360 190 372 178"></path>
    </g>
    <g stroke="#3fe0ff" stroke-width="1.3" fill="rgba(63,224,255,.05)" style="filter:drop-shadow(0 0 7px rgba(63,224,255,.6))">
      <path d="M320 300 L310 317.3 L290 317.3 L280 300 L290 282.7 L310 282.7 Z"></path>
      <path d="M320 300 L338 291" stroke-width="1"></path>
    </g>
    <g stroke="#3fe0ff" stroke-width="1.2" fill="rgba(63,224,255,.05)" opacity=".95" style="filter:drop-shadow(0 0 6px rgba(63,224,255,.55))">
      <path d="M346 232 L338 245.9 L322 245.9 L314 232 L322 218.1 L338 218.1 Z"></path>
      <path d="M322 218.1 L316 204" stroke-width="1"></path>
    </g>
    <g stroke="#3fe0ff" stroke-width="1.1" fill="rgba(63,224,255,.04)" opacity=".9" style="filter:drop-shadow(0 0 6px rgba(63,224,255,.5))">
      <path d="M313 375 L306.5 386.3 L293.5 386.3 L287 375 L293.5 363.7 L306.5 363.7 Z"></path>
      <path d="M313 375 L328 382" stroke-width="1"></path>
    </g>
    <g stroke="#3fe0ff" stroke-width="1" fill="none" opacity=".8" style="filter:drop-shadow(0 0 5px rgba(63,224,255,.45))">
      <path d="M382 178 L377 186.7 L367 186.7 L362 178 L367 169.3 L377 169.3 Z"></path>
      <path d="M360 426.9 L352 431.5 L344 426.9 L344 417.7 L352 413.1 L360 417.7 Z"></path>
    </g>
    <g stroke="#3fe0ff" stroke-width="1" fill="none" opacity=".6">
      <path d="M426 132 L423 137.2 L417 137.2 L414 132 L417 126.8 L423 126.8 Z"></path>
      <path d="M404 456 L401 461.2 L395 461.2 L392 456 L395 450.8 L401 450.8 Z"></path>
    </g>
    <g fill="#8fe9ff" style="filter:drop-shadow(0 0 12px #3fe0ff)">
      <circle cx="320" cy="300" r="4.6" style="animation:aboutPulse 3.4s ease-in-out infinite"></circle>
      <circle cx="322" cy="245.9" r="4" style="animation:aboutPulse 3.4s ease-in-out 1.1s infinite"></circle>
      <circle cx="293.5" cy="363.7" r="3.6" style="animation:aboutPulse 3.4s ease-in-out 2.2s infinite"></circle>
      <circle cx="367" cy="186.7" r="2.8" opacity=".85"></circle>
      <circle cx="417" cy="137.2" r="2.2" opacity=".7"></circle>
    </g>
  </g>
</svg>
`;

export default function AboutHeroArt() {
  return <div style={{ display: "flex", justifyContent: "flex-end" }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
