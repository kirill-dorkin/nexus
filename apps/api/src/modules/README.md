# API module boundaries

Каждый значимый bounded context получает структуру `domain/`, `application/`, `infrastructure/`, `interface/` только когда она действительно нужна. Не превращать каждую CRUD-таблицу в церемонию.

Планируемые ownership boundaries:

- `identity`
- `organizations`
- `authorization`
- `commerce`
- `catalog`
- `curriculum`
- `knowledge`
- `content`
- `delivery`
- `activities`
- `assessment`
- `projects`
- `mastery`
- `recommendations`
- `integrations`
- `notifications`
- `audit`

Правило: модуль не импортирует persistence model другого модуля. Синхронная связь — public application interface; асинхронные последствия — outbox/event contracts.
