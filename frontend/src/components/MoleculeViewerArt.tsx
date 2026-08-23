// Purely decorative viewer graphics from the approved design.
// Keyframes are embedded + uniquely named (see HeroRingsArt for why).
const skeletonSvg = `
<style>
  @keyframes moleculeTrace{to{stroke-dashoffset:-48}}
  @keyframes moleculePop{0%,100%{opacity:.25}50%{opacity:1}}
</style>
<svg viewBox="0 0 380 380" style="width:380px;height:380px;overflow:visible;transform:scale(1.55);transform-origin:center">
  <g stroke="rgba(63,224,255,.35)" stroke-width="2" fill="none" stroke-dasharray="5 7" style="animation:moleculeTrace 3s linear infinite"><path d="M236 190 L213 230 L167 230 L144 190 L167 150 L213 150 Z"></path><path d="M236 190 L282 164 M282 164 L328 190 M144 190 L98 216 M167 150 L167 104"></path></g>
  <g fill="#071018" stroke="rgba(111,157,196,.5)" stroke-width="2"><circle cx="213" cy="230" r="10" style="animation:moleculePop 1.8s ease-in-out infinite"></circle><circle cx="167" cy="230" r="10" style="animation:moleculePop 1.8s ease-in-out .15s infinite"></circle><circle cx="144" cy="190" r="10" style="animation:moleculePop 1.8s ease-in-out .3s infinite"></circle><circle cx="213" cy="150" r="10" style="animation:moleculePop 1.8s ease-in-out .45s infinite"></circle><circle cx="282" cy="164" r="10" style="animation:moleculePop 1.8s ease-in-out .6s infinite"></circle><circle cx="328" cy="190" r="10" style="animation:moleculePop 1.8s ease-in-out .75s infinite"></circle><circle cx="98" cy="216" r="10" style="animation:moleculePop 1.8s ease-in-out .9s infinite"></circle></g>
  <g fill="#8fe9ff" opacity=".5"><circle cx="236" cy="190" r="13" style="animation:moleculePop 1.8s ease-in-out 1.05s infinite"></circle><circle cx="167" cy="150" r="13" style="animation:moleculePop 1.8s ease-in-out 1.2s infinite"></circle><circle cx="167" cy="104" r="13" style="animation:moleculePop 1.8s ease-in-out 1.35s infinite"></circle></g>
</svg>
`;

const resultSvg = `
<style>
  @keyframes moleculeSway{0%,100%{transform:rotateY(-26deg) rotateX(6deg)}50%{transform:rotateY(26deg) rotateX(-6deg)}}
</style>
<div style="animation:moleculeSway 15s ease-in-out infinite;transform-style:preserve-3d;will-change:transform;transform-origin:center">
<svg viewBox="0 0 380 380" style="width:380px;height:380px;overflow:visible;transform:scale(1.55);transform-origin:center;will-change:transform">
  <g stroke="#6f9dc4" stroke-width="2" fill="none"><path d="M236 190 L213 230 L167 230 L144 190 L167 150 L213 150 Z"></path><path d="M236 190 L282 164 M282 164 L328 190 M144 190 L98 216 M167 150 L167 104"></path></g>
  <g fill="#071018" stroke="#6f9dc4" stroke-width="2"><circle cx="213" cy="230" r="10"></circle><circle cx="167" cy="230" r="10"></circle><circle cx="144" cy="190" r="10"></circle><circle cx="213" cy="150" r="10"></circle><circle cx="282" cy="164" r="10"></circle><circle cx="328" cy="190" r="10"></circle><circle cx="98" cy="216" r="10"></circle></g>
  <g fill="#3fe0ff" opacity=".2"><circle cx="236" cy="190" r="26"></circle><circle cx="167" cy="150" r="26"></circle><circle cx="167" cy="104" r="26"></circle></g><g fill="#8fe9ff"><circle cx="236" cy="190" r="13"></circle><circle cx="167" cy="150" r="13"></circle><circle cx="167" cy="104" r="13"></circle></g>
</svg>
</div>
`;

export function MoleculeSkeletonArt() {
  return <div dangerouslySetInnerHTML={{ __html: skeletonSvg }} />;
}

export function MoleculeResultArt() {
  return <div dangerouslySetInnerHTML={{ __html: resultSvg }} />;
}
