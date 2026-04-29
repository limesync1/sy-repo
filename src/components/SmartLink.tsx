// SmartLink — drop-in erstatning for react-router-dom's <Link/> der prefetcher
// rutens lazy-chunk så snart brugerens markør/finger nærmer sig linket. Det
// gør at klik fra forsiden til "Find services" / "Få tilbud" / "Bliv udbyder"
// føles instant, fordi JS-bundlet allerede ligger i memory når navigationen
// faktisk sker — ingen suspense-flash, ingen blank skærm.
import { forwardRef, useCallback } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { prefetchLazyRoute, routeKeyFromHref } from "@/lib/route-prefetch";

type Props = LinkProps & { prefetch?: boolean };

const SmartLink = forwardRef<HTMLAnchorElement, Props>(
  ({ to, prefetch = true, onMouseEnter, onFocus, onTouchStart, ...rest }, ref) => {
    const href = typeof to === "string" ? to : (to as any)?.pathname || "";

    const warm = useCallback(() => {
      if (!prefetch) return;
      const key = routeKeyFromHref(href);
      if (key) prefetchLazyRoute(key);
    }, [href, prefetch]);

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={(e) => { warm(); onMouseEnter?.(e); }}
        onFocus={(e) => { warm(); onFocus?.(e); }}
        onTouchStart={(e) => { warm(); onTouchStart?.(e); }}
        {...rest}
      />
    );
  },
);
SmartLink.displayName = "SmartLink";

export default SmartLink;
