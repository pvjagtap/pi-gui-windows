# Pi Desktop

A Codex-style desktop app for [pi](https://github.com/badlogic/pi-mono) — forked from [minghinmatthewlam/pi-gui](https://github.com/minghinmatthewlam/pi-gui).

## Prerequisites

- [Node.js](https://nodejs.org/) (v22+)
- [pnpm](https://pnpm.io/) (v10+)
- [Git for Windows](https://gitforwindows.org/)
- Valid model/provider API keys supported by `pi`

## Quick Start

```bash
pnpm install
pnpm dev
```

## Build & Package (Windows)

```bash
pnpm build
pnpm --filter @pi-desktop/desktop dist:win
```

The installer is output to `apps/desktop/release/`.

## Download

Pre-built Windows installers are available on the [Releases](https://github.com/pvjagtap/pi-desktop/releases) page.

## Tests

```bash
pnpm test
```

## Acknowledgements

- Upstream runtime: [badlogic/pi-mono](https://github.com/badlogic/pi-mono)
- Original GUI: [minghinmatthewlam/pi-gui](https://github.com/minghinmatthewlam/pi-gui)

## License

MIT — see [LICENSE](./LICENSE).
