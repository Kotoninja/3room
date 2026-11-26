# RoomForge (репозиторий 3room)

Целевой продукт — браузерный конструктор помещений с рисованием с нуля или по подложке, 3D, сметой и экспортом. См. [спецификацию](SPEC.md), [план работ](TODO.md) и [решения](DECISIONS.md).

## Запуск текущего прототипа

The working tree still contains the earlier editor and FloorPlanNet prototype. The target recognition flow in SPEC §8 is scheduled for T14–T15. These commands run the current implementation on macOS.

Use arm64 Node.js 24 and a current Chromium browser. Run these commands in the project directory:

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

## Edit and inspect

- In **2D**, use **Select** to inspect a wall, **Move** to drag both ends together, and **Vertex** to drag one endpoint. Moving a shared vertex also moves the connected wall ends. Use **Wall** after calibration to draw with two clicks. Use **Delete** or the selected object's properties to remove it.
- Edit lengths, thicknesses and coordinates in **Свойства**. Press Enter or leave the field to apply the value. **Measure** reports pixels before calibration and metres afterwards. Set the grid interval and each snap toggle in the left panel. Scroll to zoom and drag with **Pan**.
- In **3D**, drag to orbit, scroll to zoom and right-drag or select **Pan** to move the view. **Вид сверху**, **Перспектива** and **Сброс вида** control the camera. Clicking a wall shows the same selection and properties as in 2D.
- Use **Cmd+Z** and **Cmd+Shift+Z** for geometry history, **Delete** or **Backspace** to remove the 2D selection, and **Escape** to cancel a gesture. Importing a new plan starts a new history.

## Checks

```sh
npm run typecheck
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

The Quality workflow runs clean install, lint, type checking, unit tests and build on pushes and pull requests. To format files locally, run `npm run format`.

With the checkpoint installed, the default real ONNX smoke test exercises the empty-result UI using a bare rectangle. To verify the complete recognition-to-3D flow, set `THREEROOM_TEST_PLANS=/path/first.png,/path/second.png` to clean and complex fixtures expected to produce at least one closed room. These tests block external requests and attach the inferred 2D overlays. Tests for partial results and failures also use a separate test page or deliberately unavailable weights.

To test the production build offline, prepare the model before running `npm run build`, then use `npm run preview`.
