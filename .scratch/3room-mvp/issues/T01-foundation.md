# T01: Каркас и контроль качества

**Status:** ready-for-agent

**Blocked by:** None (can start immediately)

Источник: [SPEC.md](../../../SPEC.md), §3, §14–16.

## Критерии приёмки

- [ ] React 18, R3F 8 и Drei 9 совместимы. Код проходит TypeScript strict без API React 19.
- [ ] Работают dev, preview, build, lint, typecheck, test, test:e2e. ESLint и Prettier настроены. GitHub Actions выполняет npm ci, lint, typecheck, test и build.
- [ ] При миграции сохраняется рабочий сценарий текущего редактора, существующие проверки адаптируются к версиям зависимостей.
