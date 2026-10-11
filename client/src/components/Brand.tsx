import logoFull from "../assets/light.png";
import logoMark from "../assets/logo-mark.png";

// Light theme: the full SpentWise logo.
// Dark theme: the round mark + a text wordmark (the logo's navy text
// would disappear on a dark background). CSS picks which one shows.
export default function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`brand brand-${size}`}>
      <img className="brand-full" src={logoFull} alt="SpentWise" />
      <span className="brand-compact">
        <img src={logoMark} alt="" />
        <span className="brand-word">
          Spent<span>Wise</span>
        </span>
      </span>
    </span>
  );
}
