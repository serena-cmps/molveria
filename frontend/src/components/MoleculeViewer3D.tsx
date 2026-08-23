import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Atom3D, Bond3D } from "../lib/api";

const BASE_COLOR = new THREE.Color("#6f9dc4"); // "carbon skeleton" — design's own legend colour
const HOT_COLOR = new THREE.Color("#8fe9ff"); // "influential atom" — design's own legend colour
const BG = 0x000000; // transparent — the panel behind shows through

interface AtomMeshEntry {
  mesh: THREE.Mesh;
  baseRadius: number;
}

export default function MoleculeViewer3D({
  atoms,
  bonds,
  weights,
  className,
  style,
}: {
  atoms: Atom3D[];
  bonds: Bond3D[];
  /** atom index -> 0..1 importance for the currently selected property */
  weights: Record<number, number>;
  className?: string;
  style?: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const atomMeshesRef = useRef<AtomMeshEntry[]>([]);
  const weightsRef = useRef(weights);
  useEffect(() => {
    weightsRef.current = weights;
  }, [weights]);

  // Rebuild the scene whenever the molecule itself changes (new atoms/bonds).
  // Deliberately NOT keyed on `weights` — switching property panels should
  // only recolor the existing meshes (handled in the second effect), never
  // tear down and rebuild the geometry/camera/controls.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || atoms.length === 0) return;
    if (tooltipRef.current) tooltipRef.current.style.display = "none";

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(BG, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting: ambient fill + a couple directional lights so the molecule
    // reads as 3D from any rotation angle, not lit from one fixed side.
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xbfe8ff, 0.9);
    key.position.set(4, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fe9ff, 0.4);
    rim.position.set(-6, -3, -4);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);

    // Center the molecule on its own centroid so it rotates in place.
    const centroid = new THREE.Vector3();
    atoms.forEach((a) => centroid.add(new THREE.Vector3(a.x, a.y, a.z)));
    centroid.divideScalar(atoms.length);

    const positions = new Map<number, THREE.Vector3>();
    atoms.forEach((a) => positions.set(a.index, new THREE.Vector3(a.x, a.y, a.z).sub(centroid)));

    // Bonds first (so atom spheres render on top / occlude bond ends cleanly)
    const bondMaterial = new THREE.MeshStandardMaterial({ color: "#6f9dc4", roughness: 0.5, metalness: 0.1 });
    const bondRadius = 0.07;
    for (const bond of bonds) {
      const start = positions.get(bond.begin);
      const end = positions.get(bond.end);
      if (!start || !end) continue;
      const dir = new THREE.Vector3().subVectors(end, start);
      const length = dir.length();
      if (length < 1e-6) continue;
      const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 10);
      const mesh = new THREE.Mesh(geometry, bondMaterial);
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      group.add(mesh);
    }

    // Atoms — one entry per atom, base radius nudged by element so heavier
    // atoms (O, N) read slightly larger than H/C, then further scaled by
    // importance weight in the color-update effect below.
    const atomMeshes: AtomMeshEntry[] = [];
    const elementRadius: Record<string, number> = { H: 0.22, C: 0.32, N: 0.32, O: 0.32, S: 0.36, F: 0.3, Cl: 0.36 };
    for (const atom of atoms) {
      const pos = positions.get(atom.index);
      if (!pos) continue;
      const baseRadius = elementRadius[atom.symbol] ?? 0.32;
      const geometry = new THREE.SphereGeometry(baseRadius, 24, 18);
      const material = new THREE.MeshStandardMaterial({
        color: BASE_COLOR.clone(),
        roughness: 0.35,
        metalness: 0.15,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      mesh.userData.atomIndex = atom.index;
      group.add(mesh);
      atomMeshes.push({ mesh, baseRadius });
    }
    atomMeshesRef.current = atomMeshes;

    // Frame the camera to the molecule's actual size so a 3-atom and a
    // 20-atom molecule both fill the viewport sensibly.
    const bounds = new THREE.Box3().setFromObject(group);
    const size = bounds.getSize(new THREE.Vector3()).length() || 3;
    const distance = Math.max(size * 1.6, 4);
    camera.position.set(distance * 0.6, distance * 0.4, distance * 0.8);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    controls.enablePan = false;
    controls.minDistance = distance * 0.3;
    controls.maxDistance = distance * 3;

    let resumeTimer: number | undefined;
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      if (resumeTimer) window.clearTimeout(resumeTimer);
    });
    controls.addEventListener("end", () => {
      resumeTimer = window.setTimeout(() => {
        controls.autoRotate = true;
      }, 1500);
    });

    // Hover (mouse) / tap (touch) atom tooltip — element symbol, its current
    // importance weight, and a cheap functional-group tag when RDKit found
    // one. Colour alone tells a chemist which atom mattered; it doesn't tell
    // them by how much, or which one they're even looking at.
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    let pointerDown: { x: number; y: number; t: number } | null = null;

    const showTooltipAt = (clientX: number, clientY: number) => {
      const rendererRect = renderer.domElement.getBoundingClientRect();
      pointerNDC.x = ((clientX - rendererRect.left) / rendererRect.width) * 2 - 1;
      pointerNDC.y = -((clientY - rendererRect.top) / rendererRect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(
        atomMeshesRef.current.map((a) => a.mesh),
        false
      );
      const tooltipEl = tooltipRef.current;
      if (!tooltipEl) return;
      if (hits.length === 0) {
        tooltipEl.style.display = "none";
        return;
      }
      const idx = hits[0].object.userData.atomIndex as number;
      const atom = atoms.find((a) => a.index === idx);
      if (!atom) {
        tooltipEl.style.display = "none";
        return;
      }
      const weight = weightsRef.current[idx] ?? 0;
      tooltipEl.textContent = atom.functional_group ? `${atom.symbol} · ${weight.toFixed(2)} · ${atom.functional_group}` : `${atom.symbol} · ${weight.toFixed(2)}`;
      const containerRect = container.getBoundingClientRect();
      const left = Math.min(Math.max(clientX - containerRect.left + 14, 4), containerRect.width - 4);
      const top = Math.min(Math.max(clientY - containerRect.top - 14, 4), containerRect.height - 4);
      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
      tooltipEl.style.display = "block";
    };
    const hideTooltip = () => {
      if (tooltipRef.current) tooltipRef.current.style.display = "none";
    };
    const onPointerMove = (e: PointerEvent) => {
      // Touch only fires pointermove while dragging (rotating) — a plain tap
      // is handled separately below via pointerup.
      if (e.pointerType === "touch") return;
      showTooltipAt(e.clientX, e.clientY);
    };
    const onPointerDown = (e: PointerEvent) => {
      pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onPointerUp = (e: PointerEvent) => {
      const down = pointerDown;
      pointerDown = null;
      if (e.pointerType !== "touch" || !down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const elapsed = performance.now() - down.t;
      // A real drag (rotate gesture) moves more than this or takes longer —
      // only a stationary tap should surface the tooltip.
      if (moved < 8 && elapsed < 500) showTooltipAt(e.clientX, e.clientY);
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", hideTooltip);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let frameId: number;
    let stopped = false;
    const animate = () => {
      if (stopped) return;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    // Pause the render loop entirely when off-screen (matches the same
    // performance discipline used for the rest of this app's motion).
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible && stopped) {
          stopped = false;
          animate();
        } else if (!visible && !stopped) {
          stopped = true;
          cancelAnimationFrame(frameId);
        }
      },
      { threshold: 0.01 }
    );
    visibilityObserver.observe(container);

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (resumeTimer) window.clearTimeout(resumeTimer);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", hideTooltip);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      atomMeshes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      group.children.forEach((child) => {
        if (child instanceof THREE.Mesh && !atomMeshes.some((a) => a.mesh === child)) {
          child.geometry.dispose();
        }
      });
      bondMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      atomMeshesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atoms, bonds]);

  // Recolor/rescale atoms when the selected property's weights change —
  // cheap, no scene rebuild, so switching panels rehighlights instantly.
  useEffect(() => {
    for (const { mesh, baseRadius } of atomMeshesRef.current) {
      const idx = mesh.userData.atomIndex as number;
      const weight = weights[idx] ?? 0;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.lerpColors(BASE_COLOR, HOT_COLOR, weight);
      material.emissive.set(HOT_COLOR);
      material.emissiveIntensity = weight * 0.9;
      const scale = 1 + weight * 0.55;
      mesh.scale.setScalar(scale);
      void baseRadius;
    }
  }, [weights]);

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%", position: "relative", ...style }}>
      <div
        ref={tooltipRef}
        style={{
          display: "none",
          position: "absolute",
          zIndex: 10,
          pointerEvents: "none",
          padding: "5px 9px",
          borderRadius: 6,
          border: "1px solid rgba(143,233,255,.45)",
          background: "rgba(4,8,14,.92)",
          color: "#eafdff",
          font: "500 11.5px/1 'JetBrains Mono',monospace",
          letterSpacing: ".02em",
          whiteSpace: "nowrap",
          boxShadow: "0 0 16px rgba(63,224,255,.3)",
        }}
      />
    </div>
  );
}
