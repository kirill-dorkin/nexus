## Что изменено


## Почему


## Архитектурное влияние

- [ ] Domain glossary/invariants не меняются
- [ ] ADR добавлен/обновлён, если решение долгоживущее
- [ ] API/event/schema изменения backward-compatible или versioned

## Security / tenancy

- [ ] Server-side authorization проверен
- [ ] Tenant context сохраняется
- [ ] Нет новых secrets/PII в логах
- [ ] Untrusted input не пересекает trust boundary без validation

## Проверка

- [ ] `pnpm check`
- [ ] Миграции проверены (если есть)
- [ ] Accessibility проверена (если есть UI)
