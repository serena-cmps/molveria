import { Link } from "react-router-dom";
import Logo from "./Logo";
import { brand, nav } from "../content";
import { ROUTES } from "../routes";

const linkStyle: React.CSSProperties = { color: "rgba(219,230,242,.55)", textDecoration: "none" };

export default function Footer() {
  return (
    <div style={{ borderTop: "1px solid rgba(63,224,255,.16)", background: "rgba(63,224,255,.02)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "24px 44px" }}>
        <Link to={ROUTES.home} style={{ display: "flex", alignItems: "center", gap: 10, color: "#dbe6f2", textDecoration: "none" }}>
          <Logo size={20} />
          <span style={{ font: "700 13px/1 'Space Grotesk',sans-serif", letterSpacing: ".14em" }}>{brand.wordmark}</span>
        </Link>
        <div
          style={{
            display: "flex",
            gap: 24,
            font: "400 11.5px/1 'IBM Plex Mono',monospace",
            letterSpacing: ".06em",
            color: "rgba(219,230,242,.55)",
          }}
        >
          <Link to={ROUTES.modelCard} style={linkStyle}>{nav.model}</Link>
          <Link to={ROUTES.benchmarks} style={linkStyle}>{nav.benchmarks}</Link>
          <Link to={ROUTES.api} style={linkStyle}>{nav.api}</Link>
          <Link to={ROUTES.about} style={linkStyle}>{nav.about}</Link>
          <Link to={ROUTES.modelCard} style={linkStyle}>{nav.modelCard}</Link>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 24,
          padding: "15px 44px",
          borderTop: "1px solid rgba(63,224,255,.1)",
          font: "400 11px/1.6 'IBM Plex Mono',monospace",
          color: "rgba(219,230,242,.4)",
        }}
      >
        <span>{brand.copyright}</span>
        <span>{brand.disclaimer}</span>
      </div>
    </div>
  );
}
