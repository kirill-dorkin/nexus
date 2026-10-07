# UI foundation

Import `@platform/design-tokens/tokens.css` and `@platform/ui/styles.css` once in the application root, then import components from `@platform/ui`.

Components use native elements, typed native props and React 19 ref props for controls. They can render in Server Components; pass handlers only from client consumers. `Button` defaults to `type="button"`; set `type="submit"` explicitly in forms. `loading` sets busy state and disables another click. `ButtonLink` is a real anchor; Next consumers can alternatively apply `buttonClass()` to `next/link`.

`Surface` and `Card` accept `appearance="glass|solid|quiet"` and `padding="none|sm|md|lg"`. Glass has a solid fallback. `Heading` separates semantic level from visual size. `Progress` takes a percentage; undefined/non-finite means unknown, not zero. `Skeleton` is decorative; name and mark the containing region busy. `Disclosure` uses native details/summary.

`Field` renders a label and optional `id-hint` / `id-error` descriptions. Callers must give the control the same id as `htmlFor`, connect relevant descriptions with `aria-describedby`, and set `aria-invalid` when invalid. There is no hidden cloning, automatic identifier generation or validation policy.

```tsx
<Field htmlFor="title" label="Course title" hint="Visible to learners">
  <Input id="title" required aria-describedby="title-hint" />
</Field>
<Button type="submit" loading={saving}>Save</Button>
```

Tokens are semantic CSS custom properties, not hardcoded component palettes. Scope `data-ui-theme="light"` for the alternate theme. Override variables at a host/container to extend the theme. `className` and native props support composition. Do not put domain reads, auth state, canonical progress policy or persistent user preferences in this package.

Live examples are at Web `/ui`; the implementation roadmap is `docs/roadmap/ui-library.md`. Compound overlays, controlled widgets and application patterns are intentionally separate follow-up slices.
