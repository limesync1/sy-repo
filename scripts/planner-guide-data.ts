// Dumper funktionskataloget som JSON, så PDF-generatoren (Python/reportlab)
// bruger præcis samme indhold som den søgbare guide i appen.
// Kør: bun scripts/planner-guide-data.ts > /tmp/planner-features.json
import { PLANNER_FEATURES, PLANNER_FEATURE_CATEGORIES } from "../src/data/routePlannerFeatures";
console.log(JSON.stringify({ categories: PLANNER_FEATURE_CATEGORIES, features: PLANNER_FEATURES }, null, 2));
