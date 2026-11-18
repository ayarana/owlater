# Contributing

Thanks for wanting to help. This is a small side project, so there's no heavy process.

## Found a bug or have an idea?

Open an issue and pick the matching template. For bugs, the more detail the better: browser, steps to reproduce, and what you expected.

If you're not sure whether something is a good fit, open an issue first and we can talk about it before you spend time on it.

## Running it locally

There's no build step and nothing to install. It's plain HTML, CSS and JavaScript.

1. Clone the repo.
2. Open `chrome://extensions` and turn on Developer mode.
3. Click "Load unpacked" and choose the `src` folder.
4. After changing code, hit the reload button on the extension's card. For the board page, refresh the tab too.

## Sending a pull request

1. Fork the repo and create a branch from `main`.
2. Keep the change focused. Small PRs are much easier to review than big ones.
3. Try it in the browser, in a light and a dark theme if you touched the UI.
4. Open the PR and fill in the template.

A few things to keep in mind:

- Saved cards and settings live in `chrome.storage.local`. If you change how they're stored, make sure old data still loads (`storage.js` already migrates a few older formats).
- No external requests or tracking. Everything stays in the browser, and fonts are bundled in `src/fonts`.
- Icons come from [Lucide](https://lucide.dev). If you add one, copy its SVG paths into the `ICONS` object in `src/board.js`.
- Theme colors are CSS variables in `src/theme.css`, so new UI should use those instead of hardcoded colors.

By contributing, you agree that your work is released under the project's MIT License.
