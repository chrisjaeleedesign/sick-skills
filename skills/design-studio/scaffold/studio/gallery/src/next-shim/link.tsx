/**
 * Replacement for "next/link" — aliased in vite.config.ts.
 * Plain anchor with client-side navigation; modified clicks keep
 * browser-default behavior (new tab etc.).
 */
import { forwardRef } from "react";
import { navigate } from "./navigation";

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, onClick, ...rest },
  ref,
) {
  return (
    <a
      ref={ref}
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
});

export default Link;
