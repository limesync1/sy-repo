---
name: Button & menu hover states
description: Global rule for ghost/outline button + menu item hover — use secondary, never the saturated accent blue
type: design
---
`--accent` is a strong saturated blue (206 99% 30%) with white foreground. Using it for hover/focus on
ghost/outline buttons and menu items makes them flash solid blue, and when text is overridden to a dark
color it produces broken low-contrast (dark-on-blue) states.

Rule: interactive hover/focus surfaces use `secondary` (light gray), NOT `accent`.
- button.tsx: ghost + outline hover = `hover:bg-secondary hover:text-secondary-foreground`. Base has `active:scale-[0.97]` for tactile feedback.
- dropdown-menu / context-menu / select / command items: `focus:bg-secondary focus:text-secondary-foreground` (and `data-[selected]/[state=open]:bg-secondary`).
- Reserve `accent` (blue) for emphasis like active filter pills, links, focus rings — not generic hover.
