 Copilot Instructions — Sudoku Refactor Project

Standing conventions for all suggestions in this repository.

## Stack
- Backend: Python 3.11+, Flask. No database — puzzle state lives in the Flask
  session; player scores live in browser localStorage.
- Frontend: vanilla HTML/CSS/JS. No frameworks, no build step, no bundler.
- Tests: pytest with Flask's built-in test client.

## Python style
- PEP 8. Four-space indent, snake_case.
- Every public function gets a docstring explaining WHY it exists, not just what
  it does.
- Game logic lives in `sudoku_logic.py` as small pure functions that can be unit
  tested without Flask. Routes in `app.py` stay thin: parse input, call logic,
  return JSON. Business logic never goes inside a route handler.
- Defensive input handling: missing JSON body, invalid difficulty, no active
  session. Return a 400 with a JSON `error` key rather than raising.
- SECURITY: the puzzle solution must never be sent to the client. It stays in
  the Flask session and is used server-side for /check and /hint.

## JavaScript style
- ES2020+, vanilla. No jQuery.
- Use event delegation — one listener on the board container, never one listener
  per cell.
- All game state lives in a single `state` object. No scattered globals.
- Every localStorage read is wrapped in try/catch; corrupted data degrades
  gracefully to an empty default, never an uncaught throw.
- Escape any user-supplied string before inserting it into the DOM.
- Keep concerns separated: rendering, timer, API calls, leaderboard, and theme
  are distinct function groups.

## CSS style
- All colors are CSS custom properties on :root, overridden under
  [data-theme="dark"]. Never hardcode a hex value in a rule.
- Alternating 3x3 box shading is driven by a class applied per cell based on box
  index parity, computed in JS — not nth-child selectors, because the board
  re-renders on every new game.
- Mobile-first. Layout must not break at 360px. Use clamp() for font sizes and
  aspect-ratio for the board.
- Target WCAG 2.1 AA: 4.5:1 contrast for text, visible focus indicators, and
  never convey state through color alone.

## Testing
- Run `pytest` after every change, before moving to the next feature.
- Each new feature gets at least one happy-path test and one error-case test.
- Never modify a test purely to make failing code pass — fix the code.

## Working style
- Explain any non-obvious suggestion before I accept it.
- Prefer small, reviewable changes over large rewrites.
- If a suggestion has a security or correctness tradeoff, say so explicitly.