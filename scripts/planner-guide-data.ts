// Dumper ruteplanlæggerens funktioner som JSON, så PDF-generatoren
// (Python/reportlab) bruger præcis samme indhold som guiden i appen.
// Kør: node scripts/build-planner-guide.mjs
import { plannerOnlyFeatures, PLANNER_FEATURE_CATEGORIES } from "../src/data/routePlannerFeatures";
console.log(JSON.stringify({ categories: PLANNER_FEATURE_CATEGORIES, features: plannerOnlyFeatures() }, null, 2));
