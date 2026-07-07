# Concepts fondamentaux

## Un modèle, plusieurs cibles

Decorix part d'un principe simple : décrire une entité métier **une seule
fois** (les champs, leurs contraintes, leurs libellés), puis dériver de cette
description neutre tout ce dont une application a besoin — validation runtime,
configuration de formulaire pour un framework donné, ou schéma JSON pour de la
documentation/interopérabilité. Le modèle ne connaît aucun framework ; ce sont
les *adapters* qui traduisent la métadonnée vers une cible précise (voir
[Adapters de formulaires](./adapters.md)).

## Décorateurs vs Builder

Les deux syntaxes produisent exactement la même métadonnée interne
(`ModelMetadata`) — le choix est une question de style, pas de fonctionnalité :

| | Décorateurs | Builder |
| --- | --- | --- |
| Style | Classe TypeScript avec `@Model` / `@Required` / ... | Objet fonctionnel avec `model()` / `stringField()` / ... |
| Nécessite | `experimentalDecorators: true` dans `tsconfig.json` | Rien de spécial |
| Tableaux de champs imbriqués | Type d'élément non déclaratif (limite du CLI, voir plus bas) | `.item(...)` typé explicitement |
| Convient bien à | Des DTOs proches de classes existantes (Nest, ORM) | Des schémas définis dynamiquement ou generés |

Rien n'empêche de mélanger les deux styles entre modèles différents d'un même
projet.

## Métadonnée et registre de contraintes

Chaque champ porte une liste de contraintes sous la forme
`{ name, options, message, groups }`. Les contraintes natives (présence,
chaînes, nombres, dates, collections, énumérations, cross-field) sont
enregistrées dans un `ConstraintRegistry` par défaut
(`defaultConstraintRegistry`) — voir le tableau complet dans
[`packages/core/README.md`](../../packages/core/README.md#constraint-reference).
Vous pouvez enregistrer vos propres contraintes dans ce registre ou dans un
registre isolé (utile pour des tests, ou pour éviter des collisions de noms
entre modules) — voir
[Guide de validation](./validation-guide.md#contraintes-personnalisées).

## `ValidatorAdapter` : un contrat neutre et optionnel

Les adapters qui exécutent une validation à l'exécution (React Hook Form,
TanStack Form, VeeValidate, FormKit, Nest) acceptent un `options.validator`
optionnel, conforme au contrat neutre `ValidatorAdapter` de
`@hermiforge-decorix/core`. **Vous n'avez rien à installer ni à brancher**
pour obtenir une validation fonctionnelle : quand `options.validator` est
omis, ces adapters retombent sur le validateur core
(`createCoreValidatorAdapter()`), qui implémente à lui seul les contraintes
natives, personnalisées, cross-field et async.

Ne passez un adaptateur explicite que si vous voulez un moteur différent —
typiquement Zod, si votre application construit déjà des schémas Zod ailleurs
et que vous voulez une seule librairie de validation dans tout le code :

```ts
import {createZodValidatorAdapter} from '@hermiforge-decorix/zod';
import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';

const validator = createZodValidatorAdapter();
const config = toReactHookForm(RegisterUserDto, {validator});
```

`registerZodValidator()` enregistre Zod dans un **registre global**
(`getDefaultValidatorAdapter()`), mais au moment où ces lignes sont écrites,
les adapters ci-dessus ne consultent pas ce registre global quand
`options.validator` est omis — ils utilisent directement le facade core à la
place. En pratique, enregistrer un adaptateur par défaut n'a d'effet que si
votre propre code appelle `requireValidatorAdapter()`/
`resolveValidatorAdapter()` directement ; cela ne se branche pas
implicitement sur les appels à `toReactHookForm`/`toTanStackForm`/
`toVeeValidate`/`toFormKit`/`DecorixPipe`. Passez toujours `{validator}`
explicitement si vous avez besoin d'un moteur précis.

Deux adapters se comportent différemment :

- **Angular Reactive Forms** construit un schéma core automatiquement, mais
  seulement quand le modèle a des contraintes cross-field/objet ou async ;
  les contraintes simples par champ restent purement des `ValidatorFn`
  natifs, sans aucun adaptateur.
- **Angular Signal Forms** n'utilise jamais de `ValidatorAdapter` : les
  contraintes sont mappées directement sur les validateurs natifs d'Angular
  via le registre de contraintes Decorix, sans passer par ce contrat.

## Positionnement : validation, pas transformation

Decorix est un validateur pur : il vérifie qu'une valeur satisfait une
contrainte et rapporte des anomalies, mais **ne mute et ne convertit jamais**
la valeur d'entrée (pas de trim automatique, pas de coercition
chaîne→nombre, pas de parsing de date). Si vous avez besoin de ce
comportement, pré-traitez la valeur vous-même (ou via votre librairie de
formulaire) avant qu'elle n'atteigne Decorix.
