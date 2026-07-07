# Dépannage

## `Cannot read properties of undefined (reading 'constructor')`

Les décorateurs Decorix sont des décorateurs TypeScript **legacy**, pas les
décorateurs standards TC39. Votre fichier doit être transpilé avec
`"experimentalDecorators": true` dans le `tsconfig.json` applicable.

- Dans un projet classique, activez ce flag dans votre `tsconfig.json`.
- Avec la CLI `decorix`, ce message signifie que le `tsconfig.json` résolu
  automatiquement (le plus proche du fichier d'entrée, sinon le cwd) n'active
  pas le flag — passez-en un explicitement avec `--tsconfig <fichier>`. Voir
  [CLI `decorix`](./cli.md#pré-requis-pour-les-dtos-à-décorateurs).

## `validate()` rejette mon modèle avec une erreur sur des contraintes async

`validate` est **synchrone** et refuse volontairement tout modèle contenant
une contrainte définie avec `defineAsyncConstraint`/`createAsyncConstraint`,
plutôt que de retourner un résultat silencieusement incomplet. Utilisez
`validateAsync` à la place, ou détectez le cas générique avec
`hasAsyncConstraints(metadata)` + `runSchemaAsync(...)` — voir
[Guide de validation § Validation asynchrone](./validation-guide.md#validation-asynchrone).

## La CLI ne trouve pas mon modèle (`scan` renvoie une liste vide)

- Le modèle doit être **exporté** (`export class UserDto` ou
  `export const UserDto = model(...)`) — un modèle non exporté est invisible
  pour la CLI.
- Si le fichier exporte plusieurs modèles, passez `--model <nom>` pour lever
  l'ambiguïté (nom du modèle ou nom de l'export).

## Avertissement de peer dependency (React/Angular/Vue)

Les adapters déclarent leurs peer dependencies en plage caret sur la
même baseline majeure/mineure que celle testée (ex. `"react": "^19.2.0"`).
Un avertissement pour une version antérieure à la baseline, ou une majeure
différente, signale une réelle incompatibilité potentielle — vérifiez la
version testée dans le `package.json` de l'adapter concerné.

## Une valeur n'est pas transformée/nettoyée comme attendu

Decorix ne fait **aucune** coercition ou transformation (pas de trim, pas de
conversion chaîne→nombre, pas de parsing de date) — voir
[Concepts fondamentaux § Positionnement](./core-concepts.md#positionnement--validation-pas-transformation).
Si votre cas nécessite une transformation, faites-la avant que la valeur
n'atteigne Decorix (dans votre librairie de formulaire, ou un mappeur dédié).

## `fromJsonSchema` / import de schéma externe

N'importez que des schémas de confiance : un `pattern` importé devient une
`RegExp` réellement exécutée à chaque validation, ce qui expose à un risque de
ReDoS si le schéma provient d'une source non fiable. Voir
[JSON Schema § Sécurité](./json-schema.md#sécurité--nimportez-que-des-schémas-de-confiance).

## Autre chose ?

Consultez le README du package concerné (`packages/core/README.md`,
`packages/adapters/*/README.md`, `packages/cli/README.md`) — chacun documente
ses propres limitations connues. Pour un bug reproductible, ouvrez une issue
GitHub ; pour une vulnérabilité, suivez [`SECURITY.md`](../../SECURITY.md) plutôt
qu'une issue publique.
