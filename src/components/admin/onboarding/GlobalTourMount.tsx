import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useDatabase";
import TourOverlay from "./TourOverlay";

/**
 * Monteres globalt i App-træet så et tour-overlay kan leve videre når
 * brugeren navigerer mellem fx /virksomhed og /virksomhed/ruter.
 * Henter kun virksomhed hvis brugeren er logget ind — undgår unødige queries.
 */
export const GlobalTourMount = () => {
  const { user } = useAuth();
  const { data: business } = useMyBusiness();
  if (!user) return null;
  return <TourOverlay businessId={business?.id} />;
};

export default GlobalTourMount;