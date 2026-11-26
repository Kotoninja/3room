# T01: Каркас и контроль качества

**Status:** resolved

**Blocked by:** None (can start immediately)

Источник: [SPEC.md](../../../SPEC.md), §3, §14–16.

## Критерии приёмки

- [x] React 18, R3F 8 и Drei 9 совместимы. Код проходит TypeScript strict без API React 19.
- [x] Работают dev, preview, build, lint, typecheck, test, test:e2e. ESLint и Prettier настроены. GitHub Actions выполняет npm ci, lint, typecheck, test и build.
- [x] При миграции сохраняется рабочий сценарий текущего редактора, существующие проверки адаптируются к версиям зависимостей.

## Comments

- React и React DOM 18.3.1, R3F 8.18.0 и Drei 9.122.0 установлены без обхода peer-зависимостей. Strict TypeScript проверяет приложение, тесты и конфигурацию инструментов.
- Локально прошли чистая установка, lint, typecheck, Vitest (10/10), build и проверка форматирования конфигурации. Playwright (10/10) запустил dev и проверил старый редактор с PNG/JPEG и реальным ONNX. Preview вернул HTTP 200.
- [GitHub Actions Quality](https://github.com/Kotoninja/3room/actions/runs/45873618569) прошёл на Ubuntu и Node.js 24.
- Проверка структуры по §4: существующие каталог редактора и тесты сохранены. Vitest уже обнаруживает будущие тесты рядом с кодом в src. Перенос домена, раскладки, SVG/R3F и растрового модуля относится к следующим задачам по §16.
