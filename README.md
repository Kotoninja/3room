# 3room

3room turns a raster floor plan into an editable model of one storey. Recognition runs on the owner's device using FloorPlanNet Lite and ONNX Runtime Web WASM.

## Start on macOS

Use an arm64 Node.js release supported by Vite, such as Node 22.12 or later, and a current Chromium browser. Run these commands in the project directory:

```sh
npm ci
npm run prepare:recognition
npm run dev
```

The first two commands download dependencies and the pinned checkpoint. If you already have the ONNX file, use `npm run prepare:recognition -- /path/to/floorplannet_lite.onnx`. The script verifies the SHA-256 before copying it. The model is installed locally rather than checked into 3room. Upstream provenance and license details are in [the recognition report](docs/recognition-research.md). After setup, the editor, model and WASM run from localhost without internet access.

## Reconstruct a plan

1. Open the localhost URL printed by Vite. Upload a clear PNG or JPEG drawing of a single storey. The limit is 20 MiB and 16 megapixels.
2. Review the proposed walls in 2D. Orange markers identify breaks or geometry to check. Dashed outlines indicate door and window suggestions.
3. Mark two points of known separation, enter metres and select **«Задать масштаб»**. This applies the scale to the wall geometry. Enter the wall height.
4. Select **3D** and drag to orbit. Switch to **2D** to add a wall or select one from the list to move an endpoint, change its thickness or delete it.

Clear drawings with dark walls work best. Inspect all inferred boundaries against the underlay before using the model. Very thin lines, openings, annotations and poor scans can cause missed or extra segments. If recognition fails, calibrate the underlay and continue manually. Project persistence and published links are later tasks.

## Checks

```sh
npx tsc -b
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

With the checkpoint installed, the default real ONNX smoke test exercises the empty-result UI using a bare rectangle. To verify the complete recognition-to-3D flow, set `THREEROOM_TEST_PLANS=/path/first.png,/path/second.png` to clean and complex fixtures expected to produce at least one closed room. These tests block external requests and attach the inferred 2D overlays. Tests for partial results and failures also use a separate test page or deliberately unavailable weights.

To test the production build offline, prepare the model before running `npm run build`, then use `npm run preview`.
