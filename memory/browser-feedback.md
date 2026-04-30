# Browser Feedback Setup

## Goal
Give Claude self-serve visual + structural feedback on localhost during development,
without requiring the user to manually share screenshots.

## Decision: Chrome DevTools MCP

**Chosen tool:** [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
by the Chrome DevTools team.

**Why over Playwright or Glance:**
- Computed CSS values — verify actual applied styles (margin, padding, font-size)
- Element dimensions — confirm cards, grids, columns are the right size
- Console errors — catch broken asset paths or JS exceptions immediately
- Can also take screenshots via the DevTools protocol
- Covers ~80% of what Glance does, plus structural inspection Glance can't do

**Glance is NOT needed right now.** It adds click/scroll/interaction, useful for
testing carousels or forms — add it later if that becomes relevant.

## Setup (to do at start of next session)

1. Install the MCP server — follow instructions at:
   https://github.com/ChromeDevTools/chrome-devtools-mcp

2. Add it to Claude Code's MCP config (`.claude/settings.json` or global config)

3. Verify it connects to the running dev server at `localhost:4321`

4. Test: ask Claude to navigate to `/sobre`, take a screenshot, and inspect
   the `.awards-cards` element's computed styles

## Intended Workflow (once set up)

After implementing each section:
1. Navigate to the page in the headless browser
2. Take a screenshot — visually verify layout, spacing, colors
3. Inspect specific elements for computed CSS if something looks off
4. Fix issues before reporting back to user
