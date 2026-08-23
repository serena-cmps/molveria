// Purely decorative — no copy lives here, injected verbatim for pixel parity.
// Keyframes are embedded and uniquely named so this artwork animates correctly
// no matter which page mounts it (a shared/page-scoped keyframe name would
// vanish whenever the page that happened to define it unmounts).
const svg = `
<style>
  @keyframes heroSpin{to{transform:rotate(360deg)}}
  @keyframes heroSpinRev{to{transform:rotate(-360deg)}}
  @keyframes heroPulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.13)}}
</style>
<svg viewBox="0 0 820 820" style="width:600px;height:600px;flex:none;overflow:visible">
  <g style="transform-origin:410px 410px;animation:heroSpin 26s linear infinite;will-change:transform">
    <ellipse cx="410" cy="410" rx="360" ry="118" fill="none" stroke="#ff3d9e" stroke-width="7" opacity=".13"></ellipse>
    <ellipse cx="410" cy="410" rx="360" ry="118" fill="none" stroke="#ff3d9e" stroke-width="1.6" opacity=".9"></ellipse>
    <circle cx="770" cy="410" r="12" fill="#ff3d9e" opacity=".18"></circle>
    <circle cx="770" cy="410" r="6" fill="#ff3d9e"></circle>
  </g>
  <g style="transform-origin:410px 410px;transform:rotate(62deg);animation:heroSpinRev 34s linear infinite;will-change:transform">
    <ellipse cx="410" cy="410" rx="330" ry="104" fill="none" stroke="#3fe0ff" stroke-width="7" opacity=".13"></ellipse>
    <ellipse cx="410" cy="410" rx="330" ry="104" fill="none" stroke="#3fe0ff" stroke-width="1.6" opacity=".9"></ellipse>
    <circle cx="80" cy="410" r="12" fill="#3fe0ff" opacity=".18"></circle>
    <circle cx="80" cy="410" r="6" fill="#3fe0ff"></circle>
  </g>
  <g style="transform-origin:410px 410px;transform:rotate(124deg);animation:heroSpin 42s linear infinite;will-change:transform">
    <ellipse cx="410" cy="410" rx="296" ry="92" fill="none" stroke="#b98cff" stroke-width="7" opacity=".13"></ellipse>
    <ellipse cx="410" cy="410" rx="296" ry="92" fill="none" stroke="#b98cff" stroke-width="1.6" opacity=".9"></ellipse>
    <circle cx="706" cy="410" r="12" fill="#b98cff" opacity=".18"></circle>
    <circle cx="706" cy="410" r="6" fill="#b98cff"></circle>
  </g>
  <g stroke="#6f9dc4" stroke-width="1.6" fill="none">
    <path d="M456 410 L433 450 L387 450 L364 410 L387 370 L433 370 Z"></path>
    <path d="M456 410 L502 384 M502 384 L548 410 M364 410 L318 436 M387 370 L387 324"></path>
  </g>
  <g fill="#04060b" stroke="#6f9dc4" stroke-width="1.6">
    <circle cx="433" cy="450" r="7"></circle><circle cx="387" cy="450" r="7"></circle><circle cx="364" cy="410" r="7"></circle><circle cx="433" cy="370" r="7"></circle><circle cx="502" cy="384" r="7"></circle><circle cx="548" cy="410" r="7"></circle><circle cx="318" cy="436" r="7"></circle>
  </g>
  <g fill="#3fe0ff" opacity=".18"><circle cx="456" cy="410" r="18"></circle><circle cx="387" cy="324" r="18"></circle><circle cx="387" cy="370" r="18"></circle></g>
  <g fill="#8fe9ff">
    <circle cx="456" cy="410" r="9" style="animation:heroPulse 3s ease-in-out infinite"></circle>
    <circle cx="387" cy="324" r="9" style="animation:heroPulse 3s ease-in-out .9s infinite"></circle>
    <circle cx="387" cy="370" r="9" style="animation:heroPulse 3s ease-in-out 1.8s infinite"></circle>
  </g>
</svg>
`;

export default function HeroRingsArt() {
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
