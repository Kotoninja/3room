# План работ RoomForge

Действующий план основан на [SPEC.md](SPEC.md) §16. Сдача 2 декабря 2026 года. Статусы и чекбоксы ведутся в отдельных файлах задач. T01 закрыта. Следующая задача — T02. Прежние задачи сохранены в трекере для истории и связаны с актуальными.

| Задача | Результат | Технические блокеры |
| --- | --- | --- |
| [T01](.scratch/3room-mvp/issues/T01-foundation.md) | Каркас и контроль качества · `resolved` | — |
| [T02](.scratch/3room-mvp/issues/T02-domain.md) | Модель, схемы и каталог | T01 |
| [T03](.scratch/3room-mvp/issues/T03-geometry.md) | Базовые функции геометрии | T01, T02 |
| [T04](.scratch/3room-mvp/issues/T04-plan-store.md) | План и история | T02, T03 |
| [T05](.scratch/3room-mvp/issues/T05-app-shell.md) | Оболочка и режимы просмотра | T01, T02, T04 |
| [T06](.scratch/3room-mvp/issues/T06-svg-viewport.md) | Вьюпорт, сетка и слои SVG | T05 |
| [T07](.scratch/3room-mvp/issues/T07-draw-walls.md) | Рисование стен и привязка | T03, T04, T06 |
| [T08](.scratch/3room-mvp/issues/T08-render-walls.md) | Стены и камера в 3D | T02, T03, T05 |
| [T09](.scratch/3room-mvp/issues/T09-wall-inspector.md) | Выбор, перемещение и инспектор стены | T04, T06, T07 |
| [T10](.scratch/3room-mvp/issues/T10-raster-underlay.md) | Подготовка растровой подложки | T02, T05, T06 |
| [T11](.scratch/3room-mvp/issues/T11-calibrate-underlay.md) | Калибровка масштаба | T06, T10 |
| [T12](.scratch/3room-mvp/issues/T12-openings.md) | Ручные двери и окна | T04, T06, T08, T09 |
| [T13](.scratch/3room-mvp/issues/T13-rooms.md) | Граф, комнаты, площадь и пол | T03, T07, T08 |
| [T14](.scratch/3room-mvp/issues/T14-detect-walls.md) | Распознавание стен на TypeScript | T02, T03 |
| [T15](.scratch/3room-mvp/issues/T15-recognition-workflow.md) | Воркер и принятие черновика | T04, T08, T09, T10, T11, T14 |
| [T16](.scratch/3room-mvp/issues/T16-furniture.md) | Каталог и расстановка мебели | T02, T04, T06, T08, T09, T13 |
| [T17](.scratch/3room-mvp/issues/T17-recognition-settings.md) | Настройки распознавания и образцы | T15 |
| [T18](.scratch/3room-mvp/issues/T18-object-inspectors.md) | Инспекторы и настройки плана | T09, T10, T12, T15, T16 |
| [T19](.scratch/3room-mvp/issues/T19-estimate.md) | Смета работ | T04, T05, T12, T13, T16 |
| [T20](.scratch/3room-mvp/issues/T20-local-projects.md) | Локальные проекты и JSON | T02, T04, T05, T10 |
| [T21](.scratch/3room-mvp/issues/T21-scene-exports.md) | Экспорт GLB и PNG | T08, T12, T13, T16 |
| [T22](.scratch/3room-mvp/issues/T22-optional-polish.md) | Камера, горячие клавиши и демо | T05, T08, T09, T13, T16 |
| [T23](.scratch/3room-mvp/issues/T23-stabilize.md) | Стабилизация интерфейса | T15, T17, T18, T19, T20 |
| [T24](.scratch/3room-mvp/issues/T24-smoke-and-deploy.md) | Smoke-тесты, CI и статический деплой | T19, T20, T23 |
| [T25](.scratch/3room-mvp/issues/T25-release-demo.md) | Заморозка и сдача | T24 |

## Порядок в случае нехватки времени

Использовать указания §16. Сначала сокращается T22, затем ввод длины в T07, GLB в T21 и список проектов в T20. Автосохранение остаётся обязательным. Критические задачи T06–T09, T12–T15 сохраняются. Подготовка релиза проверяется по §18.

## Состояние на момент перехода

Готовые части прежнего прототипа: SVG-редактор, 2D/3D, история, калибровка и экспериментальный FloorPlanNet. Новый стек, доменный контракт, запуск с пустого проекта, TypeScript-распознавание, IndexedDB, смета и экспорт требуют проверки или реализации по актуальным задачам. Предыдущие результаты не закрывают новые критерии автоматически.
