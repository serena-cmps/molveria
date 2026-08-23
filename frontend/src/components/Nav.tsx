import { Link } from "react-router-dom";
import Logo from "./Logo";
import { nav, brand } from "../content";
import { ROUTES } from "../routes";

type NavKey = "home" | "model" | "benchmarks" | "api" | "about";

const items: { key: NavKey; label: string; to: string }[] = [
  { key: "home", label: "HOME", to: ROUTES.home },
  { key: "model", label: nav.model, to: ROUTES.modelCard },
  { key: "benchmarks", label: nav.benchmarks, to: ROUTES.benchmarks },
  { key: "api", label: nav.api, to: ROUTES.api },
  { key: "about", label: nav.about, to: ROUTES.about },
];

const inactiveStyle: React.CSSProperties = { color: "rgba(219,230,242,.6)" };
const activeStyle: React.CSSProperties = {
  color: "#3fe0ff",
  paddingBottom: 3,
  borderBottom: "1px solid #3fe0ff",
};
const ctaStyle: React.CSSProperties = {
  padding: "10px 20px",
  border: "1px solid #3fe0ff",
  borderRadius: 5,
  color: "#eafdff",
  background: "rgba(63,224,255,.12)",
  textShadow: "0 0 10px rgba(63,224,255,.9)",
  boxShadow: "0 0 20px rgba(63,224,255,.5), 0 0 44px rgba(63,224,255,.22), inset 0 0 18px rgba(63,224,255,.28)",
  textDecoration: "none",
};

export default function Nav({ current }: { current: NavKey }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 44px",
        borderBottom: "1px solid rgba(90,220,255,.14)",
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(4,6,11,.86)",
        backdropFilter: "blur(12px)",
      }}
    >
      <Link to={ROUTES.home} style={{ display: "flex", alignItems: "center", gap: 11, color: "#dbe6f2", textDecoration: "none" }}>
        <Logo size={24} />
        <span style={{ font: "700 15px/1 'Space Grotesk',sans-serif", letterSpacing: ".14em" }}>{brand.wordmark}</span>
      </Link>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 30,
          font: "500 12.5px/1 'IBM Plex Mono',monospace",
          color: "rgba(219,230,242,.6)",
          letterSpacing: ".06em",
        }}
      >
        {items.map((item) =>
          item.key === current ? (
            <span key={item.key} style={activeStyle}>
              {item.label}
            </span>
          ) : (
            <Link key={item.key} to={item.to} style={{ ...inactiveStyle, textDecoration: "none" }}>
              {item.label}
            </Link>
          )
        )}
        {current === "home" ? (
          <span style={ctaStyle}>{nav.cta}</span>
        ) : (
          <Link to={ROUTES.home} style={ctaStyle}>
            {nav.cta}
          </Link>
        )}
      </div>
    </div>
  );
}
