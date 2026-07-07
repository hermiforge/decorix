# JSON Schema (export/import)

`@hermiforge-decorix/json-schema` convertit la métadonnée Decorix vers et
depuis JSON Schema draft 2020-12, sans dépendre d'un `ValidatorAdapter`.

```sh
pnpm add @hermiforge-decorix/core @hermiforge-decorix/json-schema
```

## Export

```ts
import {Email, Label, MinLength, Model, Required} from '@hermiforge-decorix/core';
import {toJsonSchema} from '@hermiforge-decorix/json-schema';

@Model('SignupDto')
class SignupDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  @Label('Name')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  email!: string;
}

const schema = toJsonSchema(SignupDto);
```

Les contraintes natives sont mappées vers leurs mots-clés JSON Schema
standards (`minLength`, `format: "email"`, bornes numériques, `enum`, mots-clés
de tableau, ...). Toute contrainte sans équivalent standard (contraintes
personnalisées, cross-field) est préservée sous l'extension
`x-decorix-constraints` (nom, `async`, options) pour ne rien perdre lors d'un
aller-retour.

## Import

`fromJsonSchema` réalise l'inverse au mieux : les mots-clés standards sont
reconvertis en contraintes natives, et les entrées `x-decorix-constraints`
sont restaurées telles quelles — `toJsonSchema(fromJsonSchema(x))` est stable
pour un schéma produit par Decorix. Les fonctions de validateur/prédicat
arbitraires ne peuvent pas être reconstruites et restent préservées sous forme
du sentinel `'[function]'`.

```ts
import {validate} from '@hermiforge-decorix/core';
import {fromJsonSchema} from '@hermiforge-decorix/json-schema';

const metadata = fromJsonSchema({
  title: 'SignupDto',
  type: 'object',
  properties: {
    name: {type: 'string', minLength: 2},
    email: {type: 'string', format: 'email'}
  },
  required: ['name', 'email']
});

validate({name: 'Al', email: 'al@example.com'}, metadata);
```

## Sécurité : n'importez que des schémas de confiance

Un mot-clé `pattern` importé (ou un `RegExp` restauré depuis
`x-decorix-constraints`) devient une contrainte **vivante**, re-exécutée à
chaque validation. Un schéma provenant d'une source non fiable (upload d'un
tiers, import non audité) peut embarquer un motif à backtracking
catastrophique (ReDoS) — `fromJsonSchema` n'applique aucune limite de
complexité/longueur sur les motifs importés. N'appelez `fromJsonSchema` que sur
des schémas de confiance : produits par `toJsonSchema`, ou audités au
préalable.

Référence complète et détails de mapping : [`packages/adapters/json-schema/README.md`](../../packages/adapters/json-schema/README.md).
