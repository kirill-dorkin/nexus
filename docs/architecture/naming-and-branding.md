# Brand-independent architecture

Цель: смена пользовательского имени продукта не требует массового rename кода, БД, package scopes, Docker services, cloud resources или API.

## Single source of truth

`packages/brand/brand.json` содержит display brand. UI импортирует `@platform/brand`.

Смена:

```bash
pnpm rebrand --name "Another Name" --slug "another-name"
pnpm check:brand
```

## Никогда не связывать бренд с

- internal package scope (`@platform/*` остаётся техническим именем);
- DB/schema names;
- event namespaces;
- API prefixes;
- module names;
- queue names/contracts;
- object keys;
- environment names;
- cloud resources;
- role/permission keys.

GitHub repository можно переименовать отдельно: код не должен зависеть от repository name.

## Brand assets

Когда появятся logo/favicon/email assets, хранить manifest/variants в brand package или object storage и ссылаться через semantic keys (`logo.primary`, `icon.app`), а не через имя продукта в paths.

## Enforcement

`pnpm check:brand` ищет текущие brand literals в `apps/` и `infra/`. Допускается только импорт brand config, а не hardcoded display name.
