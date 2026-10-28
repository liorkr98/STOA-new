# Stoa for YouTube (Chrome extension)

Spots the stocks a YouTube video is discussing and slides a small card in beside the video at
that moment, with a bull and a bear. Every tap lands in the reader's Interest Cart on Stoa.

Built with [WXT](https://wxt.dev) (Manifest V3). Permissions: the YouTube host and `storage`,
nothing else.

## Build

```bash
cd extension
npm install
npm run build
```

The build points at `http://localhost:3000` (the app running locally). For a build that talks
to the live site, set the origin when building:

```bash
WXT_STOA_ORIGIN=https://www.stoamarket.ai npm run build
```

The live site only answers the extension once this branch is merged and deployed.

## Load it in Chrome (unpacked)

1. Build it (above). The folder to load is `extension/.output/chrome-mv3`.
2. Open Chrome and type `chrome://extensions` in the address bar, then press Enter.
3. Turn on **Developer mode** (the switch at the top right).
4. Click **Load unpacked** (top left).
5. In the file picker, go to the STOA-new folder, then `extension`, then `.output`, select the
   `chrome-mv3` folder and click **Select**. (`.output` is hidden in the macOS picker: press
   Cmd+Shift+. to show hidden folders.)
6. "Stoa for YouTube" appears in the list. Its ID must read
   `aobmhpgimghcngjppdbcglejomfgioan`; the site only talks to that ID.
7. Click the puzzle-piece icon in Chrome's toolbar, then the pin beside "Stoa for YouTube", so
   the Stoa icon stays in the toolbar.
8. Open any YouTube video. After a rebuild, go back to `chrome://extensions` and click the
   circular arrow on the Stoa card to reload it, then reload the YouTube tab.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
