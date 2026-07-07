# Adapters de formulaires

Un modèle Decorix ne dépend d'aucun framework ; chaque *adapter* traduit sa
métadonnée vers la cible d'une librairie précise. Installez uniquement le(s)
package(s) correspondant à votre stack — les anciens packages agrégés
`@hermiforge-decorix/angular`, `@hermiforge-decorix/react` et
`@hermiforge-decorix/vue` n'existent délibérément pas, pour garder les
peer-dependencies étroites.

## Tableau de décision

| Framework | Package | Fonction principale | Utilise un `ValidatorAdapter` ? |
| --- | --- | --- | --- |
| Angular Signal Forms | `@hermiforge-decorix/angular-signal` | `toSignalForm` | Jamais — mappe directement sur les validateurs natifs Angular |
| Angular Reactive Forms | `@hermiforge-decorix/angular-reactive` | `toReactiveFormConfig` | Construit automatiquement (core) seulement si cross-field/async |
| React Hook Form | `@hermiforge-decorix/react-hook-form` | `toReactHookForm`, `useReactHookDecorix` | Facade core par défaut ; `{validator}` pour un autre moteur |
| React TanStack Form | `@hermiforge-decorix/react-tanstack-form` | `toTanStackForm`, `useTanStackDecorix` | Facade core par défaut ; `{validator}` pour un autre moteur |
| Vue VeeValidate | `@hermiforge-decorix/vue-vee-validate` | `toVeeValidate`, `useVeeDecorix` | Facade core par défaut ; `{validator}` pour un autre moteur |
| Vue FormKit | `@hermiforge-decorix/vue-formkit` | `toFormKit`, `useFormKitDecorix` | Facade core par défaut ; `{validator}` pour un autre moteur |
| Nest (pipe de validation) | `@hermiforge-decorix/nest` | `DecorixPipe` | Facade core par défaut ; `{validator}` pour un autre moteur |
| Zod | `@hermiforge-decorix/zod` | `toZod`, `registerZodValidator` | — (c'est lui-même un `ValidatorAdapter`) |
| JSON Schema | `@hermiforge-decorix/json-schema` | `toJsonSchema`, `fromJsonSchema` | Non |

Aucun de ces adapters n'exige d'installer `@hermiforge-decorix/zod` pour
fonctionner — la facade core implémente déjà à elle seule la validation
native/personnalisée/cross-field/async. Ne passez
`{validator: createZodValidatorAdapter()}` explicitement que si vous voulez
Zod (ou un autre moteur) à la place de la facade core — voir
[Concepts fondamentaux](./core-concepts.md#validatoradapter--un-contrat-neutre-et-optionnel).

## Limites connues par adapter

- **Angular Reactive Forms** : les contraintes cross-field/objet ne sont pas
  exprimables par un `ValidatorFn` de contrôle unique ; l'adapter expose un
  `validate` au niveau du formulaire, alimenté par le core, quand ce type de
  métadonnée est présent.
- **Vue VeeValidate** : les contraintes cross-field sont vérifiées au niveau
  du champ contre le dernier instantané connu des champs pairs (via
  `initialValues`) — un contrôle exact sur l'objet entier nécessite d'appeler
  `config.validate()`/`validateAsync()` explicitement à la soumission.
- **Vue FormKit** : seules les contraintes ayant un équivalent natif FormKit
  (`length`, `matches`, `email`, `url`, `min`, `max`, ...) apparaissent dans la
  chaîne de validation inline ; les autres (`slug`, `integer`, `past`/`future`,
  `equalsField`, contraintes personnalisées) restent appliquées uniquement via
  `config.validate()`/`validateAsync()`.
- **Angular Signal Forms** : `form()` doit s'exécuter dans un contexte
  d'injection Angular réel — les exemples exportent une factory plutôt que
  d'appeler `toSignalForm` au niveau module.

Chaque limitation est documentée en détail (et testée) dans le README du
package concerné — consultez-le avant d'implémenter un cas non couvert ici.

## Où lire la suite

- Installation, API complète et exemples : `packages/adapters/<nom>/README.md`.
- Exemples exécutables par framework : `examples/<nom>/class-model.ts` et `examples/<nom>/builder-model.ts` (`pnpm examples:run`).
- Générer la configuration d'un adapter sans écrire de code d'intégration : [CLI `decorix`](./cli.md).
