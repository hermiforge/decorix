# CLI `decorix`

`@hermiforge-decorix/cli` génère des artefacts (JSON Schema, Zod, configuration
de formulaire par framework) directement depuis un fichier de modèles, sans
écrire de code d'intégration à la main.

```sh
pnpm add -D @hermiforge-decorix/cli
```

## Principe

La CLI **charge et exécute** votre fichier d'entrée (via `tsx`/esbuild, comme le
ferait `node`/`import()`), découvre les classes `@Model` et les modèles builder
exportés, puis émet soit un JSON Schema, soit un module TypeScript fin qui
ré-exporte l'appel à l'adapter correspondant (`toZod(Model)`,
`toReactiveFormConfig(Model)`, `toSignalForm(Model)`, etc.) — les fonctions de
contrainte ne sont donc jamais sérialisées.

```sh
# Lister les modèles trouvés dans un fichier d'entrée
decorix scan ./src/dtos.ts

# Émettre un JSON Schema
decorix json-schema ./src/dtos.ts --model UserDto --out user.schema.json

# Émettre un module Zod
decorix zod ./src/dtos.ts --model UserDto --out user.zod.ts

# Émettre une config de formulaire (une commande par framework)
decorix angular-validators ./src/dtos.ts --model UserDto --out user.form.ts
decorix angular-signal ./src/dtos.ts --model UserDto --out user.signal.ts
decorix react-hook-form ./src/dtos.ts --model UserDto --out user.rhf.ts
decorix react-tanstack-form ./src/dtos.ts --model UserDto --out user.tanstack.ts
decorix vue-formkit ./src/dtos.ts --model UserDto --out user.formkit.ts
decorix vue-vee-validate ./src/dtos.ts --model UserDto --out user.vee.ts
decorix nest ./src/dtos.ts --model UserDto --out user.pipe.ts
```

`--model` sélectionne par nom de modèle ou nom d'export ; omettez-le si le
fichier n'exporte qu'un seul modèle. `--out` écrit dans un fichier, sinon
l'artefact s'affiche sur stdout. Le module généré importe le package adapter
cible (ex. `@hermiforge-decorix/zod`) — installez-le en plus de la CLI dans
votre projet.

## Pré-requis pour les DTOs à décorateurs

- **Exportez vos DTOs.** Seuls les membres exportés sont découverts
  (`export class UserDto` ou `export const UserDto = model(...)`).
- **`experimentalDecorators: true`.** Les décorateurs Decorix sont des
  décorateurs "legacy" ; la CLI résout le `tsconfig.json` le plus proche de
  votre fichier d'entrée (puis le cwd) et l'applique. Si vous obtenez
  `Cannot read properties of undefined (reading 'constructor')`, le tsconfig
  résolu n'active pas ce flag — passez `--tsconfig <fichier>` explicitement :

  ```sh
  decorix scan ./src/dtos.ts --tsconfig ./tsconfig.json
  ```

## API programmatique

```ts
import {discoverModels, renderJsonSchema, selectModel} from '@hermiforge-decorix/cli';

const models = discoverModels(await import('./src/dtos.ts'));
const json = renderJsonSchema(selectModel(models, 'UserDto'));
```

## Sécurité

Chaque commande **exécute** le fichier d'entrée pointé, exactement comme le
ferait `node` ou `import()` — ce n'est pas un parseur statique. N'exécutez la
CLI que sur des fichiers de confiance ; ne la pointez jamais sur un fichier
d'une source tierce non revue (une PR non mergée, un template téléchargé) sans
l'avoir lu au préalable, car tout code de niveau module dans ce fichier
s'exécute avec vos permissions Node locales.

Référence complète (options, couverture des 9 adapters) : [`packages/cli/README.md`](../../packages/cli/README.md).
