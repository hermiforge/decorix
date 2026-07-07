# Démarrage rapide

## 1. Installer le core

```sh
pnpm add @hermiforge-decorix/core
```

`@hermiforge-decorix/core` seul suffit pour définir des modèles et valider des
objets en mémoire — aucune dépendance de framework n'est requise à ce stade.

## 2. Décrire un modèle

Decorix propose deux syntaxes équivalentes pour décrire un modèle : des
**décorateurs** de classe, ou une **API builder** fonctionnelle. Les deux
produisent la même métadonnée interne et peuvent être mélangées dans un même
projet selon le style de chaque équipe.

Décorateurs :

```ts
import {Email, Label, MaxLength, Min, MinLength, Model, Required} from '@hermiforge-decorix/core';

@Model('RegisterUserDto')
class RegisterUserDto {
  @Required('Name is required')
  @MinLength(2, 'Name is too short')
  @MaxLength(50)
  @Label('Name')
  name!: string;

  @Required('Email is required')
  @Email('Invalid email')
  @Label('Email')
  email!: string;

  @Min(18, 'You must be an adult')
  age?: number;
}
```

Builder :

```ts
import {model, numberField, stringField} from '@hermiforge-decorix/core';

const RegisterUserDto = model('RegisterUserDto', {
  name: stringField().required('Name is required').minLength(2, 'Name is too short').maxLength(50).label('Name'),
  email: stringField().required('Email is required').email('Invalid email').label('Email'),
  age: numberField().min(18, 'You must be an adult').optional()
});
```

Voir [Concepts fondamentaux](./core-concepts.md) pour savoir quand préférer l'une ou l'autre.

## 3. Valider une valeur

```ts
import {validate} from '@hermiforge-decorix/core';

const result = validate({name: 'Al', email: 'not-an-email'}, RegisterUserDto);

if (!result.success) {
  for (const issue of result.issues) {
    console.log(issue.path, issue.code, issue.message);
  }
}
```

`validate` est synchrone et refuse tout modèle contenant une contrainte async
(voir [Guide de validation](./validation-guide.md#validation-asynchrone)) — utilisez
`validateAsync` dans ce cas.

## 4. Brancher un framework (optionnel)

Si vous utilisez React Hook Form, Angular, Vue ou Nest, installez le package
adapter correspondant en plus du core — voir
[Adapters de formulaires](./adapters.md) pour la liste complète et un tableau de
décision par framework. Exemple avec React Hook Form :

```sh
pnpm add @hermiforge-decorix/react-hook-form
```

```ts
import {toReactHookForm} from '@hermiforge-decorix/react-hook-form';

const config = toReactHookForm(RegisterUserDto);
```

Aucune installation de Zod requise : `toReactHookForm` retombe sur la facade
core de Decorix quand aucun `{validator}` n'est passé. N'ajoutez
`@hermiforge-decorix/zod` et `{validator: createZodValidatorAdapter()}` que si
vous voulez spécifiquement une validation portée par Zod — voir
[Concepts fondamentaux](./core-concepts.md#validatoradapter--un-contrat-neutre-et-optionnel).

## 5. Explorer plus loin

- [`examples/`](../../examples) contient des scripts exécutables (`pnpm examples:run`) pour chaque package, y compris des cas avancés (async, contraintes personnalisées, cross-field, objets imbriqués, groupes) dans `examples/advanced/`.
- Le [CLI `decorix`](./cli.md) génère ces mêmes artefacts (JSON Schema, Zod, config de formulaire) sans écrire de code d'intégration à la main.
