# Interoperability strategy

Standards influence internal modeling without forcing premature full implementations.

## CASE-aware skill graph

Stable skill identities, frameworks and explicit relations should map cleanly to CASE-like competency structures later.

## QTI-aware assessment

Question/Assessment/Choice/response-processing concepts are first-class, versioned structures; do not store the entire test as an arbitrary HTML/JSON blob that cannot be exported.

## xAPI adapter later

Internal learning event envelope is domain-specific and may be richer than xAPI. Export selected events through an adapter if/when interoperability requires it; do not introduce a separate LRS as foundational infrastructure.

## BCP 47 / IANA timezones

Locales use BCP 47 tags (`ru-RU`, `ky-KG`, `en`). Persist timestamps as absolute instants; display/scheduling uses IANA timezones.

## Future adapters, not current dependencies

Open Badges, OneRoster and LTI are candidate boundary adapters. They must not dictate core domain semantics today.
