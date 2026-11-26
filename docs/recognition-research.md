# Offline floor plan recognition

> Исторический отчёт о прототипе 3room. Действующее распознавание для целевой версии описано в SPEC.md §8 и ADR 0005.

Checked 24 November 2026 for 3room on Apple Silicon. The pilot candidate is FloorPlanNet Lite. It has a small, published model with synthetic training provenance and a browser build that can serve all recognition assets locally. Yytsi and CubiCasa remain comparison options for a rights-cleared noncommercial evaluation.

| Candidate | Published model and outputs | Local runtime | License and provenance |
| --- | --- | --- | --- |
| FloorPlanNet Lite | 4.2 MB INT8 ONNX. Takes raster images and classifies background, walls, rooms, doors and windows. TypeScript post-processing emits wall centrelines, room polygons and openings associated with walls. | ONNX Runtime Web WASM plus TypeScript. The upstream standalone build includes the model, WASM and examples, and can run from a local static HTTP server. | MIT repository. The checkpoint is committed alongside the code with no separate license in the model directory. Its card says it was trained from scratch on generated plans, with no ImageNet pretraining. [README](https://github.com/thatguywhodoestecheverysatnight/FloorPlanNet#results), [model card](https://github.com/thatguywhodoestecheverysatnight/FloorPlanNet/blob/9987ced5ca7bb72e705937260c90c9fb9222d800/web/public/models/model-card.json), [repository license](https://github.com/thatguywhodoestecheverysatnight/FloorPlanNet/blob/main/LICENSE) |
| Yytsi floorplan-to-3d | About 98 MB in `best.safetensors` plus `config.yaml`. UNet with ImageNet-pretrained ResNet-34 predicts floor, walls, doors and windows. The extractor emits wall, door and window polygons with holes. The floor is implicit and there are no room instances. | Python, PyTorch and Cairo. The documented API accepts SVG, defaults to CPU, and supports PyTorch MPS. The viewer references Three.js from unpkg, so use the API alone for offline testing or bundle its browser dependencies locally. | MIT code and MIT model card. The card discloses CubiCasa5K training. Commercial training and deployment rights need separate clearance before adopting the checkpoint. [README](https://github.com/Yytsi/floorplan-to-3d#try-it-locally), [model files and license](https://huggingface.co/Yytsi/floorplan-to-3d-walls), [extractor](https://github.com/Yytsi/floorplan-to-3d/blob/main/src/buildingcv/extract_polygons.py), [viewer imports](https://github.com/Yytsi/floorplan-to-3d/blob/main/viewer/index.html), [repository license](https://github.com/Yytsi/floorplan-to-3d/blob/main/LICENSE) |
| CubiCasa5K | Official `model_best_val_loss_var.pkl` is published separately. The model produces junction heatmaps, room segmentation and icon segmentation. Polygon reconstruction uses those outputs to build structural geometry. The 5,000-image dataset is a separate 5.5 GB ZIP. | The official stack specifies Python 3.6.5, PyTorch 1.0.0 and CUDA, and the evaluation script explicitly moves the model and images to CUDA. Apple Silicon would need a port and a local verification run. | The repository declares CC BY-NC 4.0. The authors’ Zenodo dataset record declares CC BY-NC-SA 4.0. The checkpoint download has no independent permissive grant identified, so keep it out of product distribution. [Release repository](https://github.com/CubiCasa/CubiCasa5k), [repository license](https://github.com/CubiCasa/CubiCasa5k/blob/master/LICENSE), [dataset rights metadata](https://zenodo.org/records/2613548/export/json), [checkpoint](https://drive.google.com/file/d/1gRB7ez1e4H7a9Y09lLqRuna0luZO5VRK/view), [evaluation code](https://github.com/CubiCasa/CubiCasa5k/blob/master/eval.py), [paper](https://arxiv.org/abs/1904.01920) |

FloorPlanNet Lite reports 0.938 mean IoU on 200 held-out procedural plans. The CubiCasa5K entries in its README are training configurations and targets. Yytsi reports 0.983 validation mean IoU over four classes on its CubiCasa5K subset. The datasets, classes and evaluation splits differ, so these scores cannot rank the candidates on 3room inputs. [FloorPlanNet results](https://github.com/thatguywhodoestecheverysatnight/FloorPlanNet#results), [Yytsi model card](https://huggingface.co/Yytsi/floorplan-to-3d-walls)

## Local verification

On the arm64 Mac, upstream `npm ci` and `npm run build:standalone` succeeded at FloorPlanNet revision `9987ced5ca7bb72e705937260c90c9fb9222d800`. Headless Chromium loaded the unmodified build from disk through Playwright request interception. The test served the ONNX, JavaScript and WASM from the local build, blocked requests outside the test origin and observed zero such requests. The model file SHA-256 was `8d6fbe7e58b9866001475e2e77c625f8f57384309ac6fcb93b92c4767d1714d4`. [Standalone instructions](https://github.com/thatguywhodoestecheverysatnight/FloorPlanNet#deploy)

| FloorPlanNet input | Rooms | Wall segments | Doors | Windows |
| --- | ---: | ---: | ---: | ---: |
| Upstream procedural demo 1 | 8 | 12 | 9 | 6 |
| CubiCasa5K 1191 | 12 | 33 | 10 | 27 |
| CubiCasa5K 3676 | 5 | 8 | 3 | 7 |
| CubiCasa5K 4068 | 5 | 13 | 2 | 7 |

These are prediction counts. The three real-plan inputs were the raster previews embedded in Yytsi’s demo JSON at revision `ccc19723d98b097b521b8289287c5143e535df0d`. The smoke test establishes the offline inference path. Accuracy and latency on 3room inputs still need measurement. Yytsi’s own SVG inference was unverified because the Homebrew environment lacked the native Cairo library. [Yytsi demo inputs](https://github.com/Yytsi/floorplan-to-3d/tree/ccc19723d98b097b521b8289287c5143e535df0d/viewer/demos), [Yytsi prerequisites](https://github.com/Yytsi/floorplan-to-3d#prerequisites)

## OpenCV.js fallback

OpenCV 4.5.0 and later is Apache-2.0. A locally bundled OpenCV.js runtime can threshold a clean raster, use morphology to bridge short gaps, then trace contours for candidate outlines with `cv.findContours`. These operations use pixel intensity and connectivity. Text and furniture can become false contours, broken wall lines can merge rooms, and a contour alone carries no door, window or room semantics. Keep the resulting geometry editable and ask the user to confirm uncertain outlines. [OpenCV license](https://opencv.org/license/), [OpenCV.js contour API](https://docs.opencv.org/4.x/d5/daa/tutorial_js_contours_begin.html)

## 3room task 01 integration

Measured on an Apple M5 with 16 GiB (17,179,869,184 bytes) using the 3room production build in Headless Chromium. Fresh browsers loaded local build artifacts by request interception and blocked external requests. The table uses worker inference time, label decoding plus vectorization time, and wall-clock time from upload to the 2D overlay. RSS is the highest observed sum of Chromium process RSS, sampled every 75 ms. It includes browser overhead and can double-count shared pages. It is an approximate upper-level process measurement, rather than a WASM heap measurement.

| Fixture | Model image | Inference | Vectorization | Upload to overlay | Sampled Chromium RSS | Wall segments / closed faces |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| CubiCasa5K 3676 | 512 × 260 | 572 ms | 151 ms | 2,011 ms | 440 MiB | 13 / 2 |
| CubiCasa5K 1191 | 512 × 325 | 520 ms | 163 ms | 1,520 ms | 546 MiB | 52 / 5 |
| CubiCasa5K 4068 | 512 × 169 | 294 ms | 101 ms | 1,019 ms | 520 MiB | 20 / 2 |

Visual inspection of 3676 found all four boundary sides of the rectangular room on the right, with no stray wall inside that room. The larger area on the left remains open at the entrance. On 1191 the main rectilinear walls mostly align, but the bay at the bottom has at least two missed diagonal sides, and at least two stray short segments appear around the right exterior stair. The owner can connect or add missing sides and remove those segments. On 4068 some doors leave open wall stubs, and two large closed faces absorb subdivisions missed at those openings. The measured graph face counts are not room recall. No aggregate accuracy is claimed.

Playwright also checks the complete 2D-to-3D path with real weights, checks for requests to the local ONNX and WASM, and asserts zero external requests. The real fixtures are used from the upstream demos for testing and are not distributed by 3room. [Fixture source](https://github.com/Yytsi/floorplan-to-3d/tree/ccc19723d98b097b521b8289287c5143e535df0d/viewer/demos)

A negative control consisting of one unannotated black rectangle on white produced no wall segments. The UI reports the empty result and leaves the manual editor available. The checkpoint is suitable for the tested architectural drawings as a source of proposals, with manual review required.
