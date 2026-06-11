/**
 * Replacement for "next/link" — aliased in vite.config.ts.
 * Plain anchor with client-side navigation; modified clicks keep
 * browser-default behavior (new tab etc.).
 *
 * Only SPA routes navigate client-side. Anything else — most importantly
 * /prototypes/* , which are standalone compiled pages, not SPA routes —
 * gets a normal full page load (without this, clicking a prototype card
 * just pushed the URL and nothing rendered until a manual refresh).
 */
import { forwardRef } from "react";
import { navigate } from "./navigation";

const SPA_PATHS = /^\/($|\?|bank(\/|$|\?)|features($|\?)|thoughts(\/|$|\?))/;

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
        if (!SPA_PATHS.test(href)) return; // full page load (e.g. /prototypes/*)
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
});

export default Link;
