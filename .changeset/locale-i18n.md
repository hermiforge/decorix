---
"@hermiforge-decorix/core": minor
---

Add locale/i18n support for native constraint messages: `LocaleRegistry`, `registerLocale`, `getLocaleMessage`, and a new `ValidationOptions.localeRegistry`. When `context.locale` matches a registered translation, `messageForConstraint`/`normalizeConstraintIssue` use it instead of the English default; missing locales/translations and explicit user message overrides behave exactly as before. Decorix ships the registration mechanism only, no bundled translation dictionary.
