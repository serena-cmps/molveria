// Static explanatory diagram from the approved design. The three output
// values are a real POST /predict snapshot for aspirin
// (CC(=O)Oc1ccccc1C(=O)O) — toxicity 0.07 (max of 12 Tox21 assays),
// solubility −2.16 (ESOL), activity 0.00 (max of 3 ChEMBL targets) — not
// invented example numbers. It's a static SVG, not wired to live state, so
// it won't update with the app's own predictions.
const svg = `
<svg viewBox="0 0 520 260" style="width:100%;height:auto;margin-top:20px;overflow:visible">
  <g stroke="#6f9dc4" stroke-width="1.4" fill="none"><path d="M74 130 L58 158 L26 158 L10 130 L26 102 L58 102 Z"></path></g>
  <g fill="#8fe9ff" style="filter:drop-shadow(0 0 10px #3fe0ff)"><circle cx="74" cy="130" r="6"></circle><circle cx="26" cy="102" r="6"></circle></g>
  <rect x="118" y="104" width="86" height="52" rx="6" fill="rgba(63,224,255,.08)" stroke="rgba(63,224,255,.45)"></rect>
  <text x="161" y="126" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="10.5" fill="#8fe9ff">MOLECULAR</text>
  <text x="161" y="142" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="10.5" fill="#8fe9ff">GRAPH</text>
  <path d="M84 130 L112 130" stroke="#3fe0ff" stroke-width="1.4"></path>
  <path d="M204 130 C240 130 240 52 276 52" stroke="#ff3d9e" stroke-width="1.4" fill="none" style="filter:drop-shadow(0 0 6px #ff3d9e)"></path>
  <path d="M204 130 L276 130" stroke="#3fe0ff" stroke-width="1.4" style="filter:drop-shadow(0 0 6px #3fe0ff)"></path>
  <path d="M204 130 C240 130 240 208 276 208" stroke="#b98cff" stroke-width="1.4" fill="none" style="filter:drop-shadow(0 0 6px #b98cff)"></path>
  <rect x="276" y="30" width="94" height="44" rx="6" fill="rgba(255,61,158,.10)" stroke="rgba(255,61,158,.5)"></rect>
  <text x="323" y="57" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="11" fill="#ff9dcb">GAT · TOX</text>
  <rect x="276" y="108" width="94" height="44" rx="6" fill="rgba(63,224,255,.10)" stroke="rgba(63,224,255,.5)"></rect>
  <text x="323" y="135" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="11" fill="#8fe9ff">GAT · SOL</text>
  <rect x="276" y="186" width="94" height="44" rx="6" fill="rgba(185,140,255,.10)" stroke="rgba(185,140,255,.5)"></rect>
  <text x="323" y="213" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="11" fill="#d3b6ff">GAT · ACT</text>
  <path d="M370 52 L410 52 M370 130 L410 130 M370 208 L410 208" stroke="rgba(219,230,242,.35)" stroke-width="1.2"></path>
  <g font-family="'JetBrains Mono',monospace" font-size="15" fill="#f2f8ff"><text x="418" y="57">0.07</text><text x="418" y="135">−2.16</text><text x="418" y="213">0.00</text></g>
  <g font-family="'IBM Plex Mono',monospace" font-size="9.5" fill="rgba(219,230,242,.45)"><text x="418" y="72">TOXICITY</text><text x="418" y="150">SOLUBILITY</text><text x="418" y="228">ACTIVITY</text></g>
</svg>
`;

export default function ArchitectureDiagram() {
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
