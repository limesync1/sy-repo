// ScrollToTop — scroller automatisk til toppen ved hver ny navigation,
// så brugeren ikke står midt på siden når en ny rute monteres.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // "auto" i stedet for "smooth" — det føles hurtigere og undgår at
    // brugeren ser to sider på én gang under animation.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;