import { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import SiteNav from "./SiteNav";

const NavigationContext = createContext(false);
export const usePersistentPublicNavigation = () => useContext(NavigationContext);

/** Keep the public navigation outside route suspense, including its menu state. */
export function PublicNavigation({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const publicPage = /^\/(?:$|index\/?$|virksomheder(?:\/|$)|tilbud(?:\/|$)|opret-virksomhed\/?$|software(?:\/|$)|priser(?:\/|$)|guides(?:\/|$)|blog(?:\/|$)|rengoering(?:\/|$)|flyttehjaelp\/|haandvaerker\/|haveservice\/|hjaelp\/?$|om-os\/?$|anmeldelser\/?$|kontakt\/?$|privatlivspolitik\/?$|vilkaar\/?$|cookies\/?$|databehandleraftale\/?$|underdatabehandlere\/?$|slet-data\/?$|godkend-bestilling\/)/.test(pathname);
  return (
    <NavigationContext.Provider value={publicPage}>
      {publicPage && <SiteNav persistent />}
      {children}
    </NavigationContext.Provider>
  );
}