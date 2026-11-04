// Cross-platform (Windows/macOS/Linux) app release: build web, then sync Capacitor in release mode.
import { execSync } from "node:child_process";

const env = { ...process.env, CAP_RELEASE: "1" };
execSync("npm run build", { stdio: "inherit", env });
execSync("npx cap sync", { stdio: "inherit", env });
