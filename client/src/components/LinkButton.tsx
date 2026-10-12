import { Link, type LinkProps } from "react-router-dom";
import type { ButtonProps } from "react-bootstrap/Button";

interface Props extends LinkProps {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

// A router <Link> styled as a Bootstrap button. react-bootstrap's Button only
// types `as` for HTML tags, so it can't take Link directly.
export default function LinkButton({
  variant = "primary",
  size,
  className,
  ...rest
}: Props) {
  const classes = ["btn", `btn-${variant}`, size && `btn-${size}`, className];
  return <Link className={classes.filter(Boolean).join(" ")} {...rest} />;
}
