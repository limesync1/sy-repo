import {
  ArrowUp, ArrowUpRight, ArrowUpLeft, ArrowRight, ArrowLeft,
  CornerUpRight, CornerUpLeft, RotateCw, Flag, Merge, Milestone,
} from "lucide-react";

/** Maps a Mapbox maneuver (type + modifier) to a clear directional icon. */
export const ManeuverIcon = ({
  type,
  modifier,
  className = "h-10 w-10",
}: {
  type?: string;
  modifier?: string;
  className?: string;
}) => {
  const t = (type || "").toLowerCase();
  const m = (modifier || "").toLowerCase();

  if (t === "arrive" || t === "end of road") return <Flag className={className} />;
  if (t === "depart") return <ArrowUp className={className} />;
  if (t === "roundabout" || t === "rotary" || t === "exit roundabout" || t === "exit rotary") {
    return <RotateCw className={className} />;
  }
  if (t === "merge") return <Merge className={className} />;

  // turn / on ramp / fork / new name etc — use modifier
  if (m.includes("uturn")) return <RotateCw className={className} />;
  if (m === "sharp right" || m === "right") return <CornerUpRight className={className} />;
  if (m === "slight right") return <ArrowUpRight className={className} />;
  if (m === "sharp left" || m === "left") return <CornerUpLeft className={className} />;
  if (m === "slight left") return <ArrowUpLeft className={className} />;
  if (m === "straight" || m === "") return <ArrowUp className={className} />;
  return <Milestone className={className} />;
};

/** Short Danish phrase for a maneuver, e.g. "Drej til højre". */
export const maneuverLabel = (type?: string, modifier?: string): string => {
  const t = (type || "").toLowerCase();
  const m = (modifier || "").toLowerCase();
  if (t === "arrive") return "Du er fremme";
  if (t === "depart") return "Kør ud";
  if (t === "roundabout" || t === "rotary") return "Rundkørsel";
  if (t === "exit roundabout" || t === "exit rotary") return "Forlad rundkørsel";
  if (t === "merge") return "Flet ind";
  if (t === "fork") return m.includes("right") ? "Hold til højre" : m.includes("left") ? "Hold til venstre" : "Vælg vejen";
  if (t === "on ramp") return "Kør på motorvejen";
  if (t === "off ramp") return m.includes("right") ? "Tag afkørslen til højre" : "Tag afkørslen til venstre";
  if (t === "continue" || t === "new name") return "Fortsæt ligeud";
  // turn (default)
  if (m === "sharp right") return "Skarpt til højre";
  if (m === "right") return "Drej til højre";
  if (m === "slight right") return "Lidt til højre";
  if (m === "sharp left") return "Skarpt til venstre";
  if (m === "left") return "Drej til venstre";
  if (m === "slight left") return "Lidt til venstre";
  if (m === "straight") return "Fortsæt ligeud";
  if (m.includes("uturn")) return "Vend om";
  return "Fortsæt";
};