# Guide de validation

## Contraintes natives

Decorix fournit un jeu complet de contraintes natives (présence/nullité,
chaînes, nombres, dates, collections, énumérations, cross-field, objet). Chaque
contrainte suit la même convention à trois noms : un décorateur PascalCase,
une méthode builder du même nom en camelCase, et un nom de contrainte
enregistré (qui apparaît dans `issue.constraint` et dans le code
`decorix.<name>`).

Le tableau exhaustif (décorateur / méthode builder / nom enregistré, par
catégorie) vit dans
[`packages/core/README.md#constraint-reference`](../../packages/core/README.md#constraint-reference)
— il n'est pas dupliqué ici pour éviter qu'il se désynchronise du code
(`packages/core/src/validation/native-constraints.ts` reste la source de
vérité).

Une valeur `null`/`undefined` est ignorée par toutes les contraintes hors
présence/nullité ; un type inattendu (ex. un nombre passé à `.minLength()`)
produit un `code: 'decorix.type'` plutôt que d'échouer silencieusement.

## Contraintes cross-field et objet

Les contraintes cross-field (`EqualsField`, `GreaterThanField`,
`RequiredIf`, `ForbiddenIf`, ...) comparent un champ à un autre champ du même
objet racine, référencé par un chemin `dot.path` sous forme de chaîne. La
valeur du champ courant et celle du champ pair doivent toutes les deux être
présentes pour que la comparaison s'applique (une valeur manquante fait sauter
la contrainte, sauf `RequiredIf`/`ForbiddenIf` qui gèrent explicitement
l'absence).

```ts
import {EqualsField, Model, Required} from '@hermiforge-decorix/core';

@Model('ChangePasswordDto')
class ChangePasswordDto {
  @Required()
  password!: string;

  @Required()
  @EqualsField('password', 'Passwords must match')
  confirmPassword!: string;
}
```

Pour une règle qui porte sur l'objet entier plutôt que sur un champ précis
(ex. « au moins un des deux champs doit être renseigné »), utilisez
`@ObjectConstraint({ path, validator, message, groups })` ou l'aide
`objectConstraint(...)` côté builder.

Voir `examples/advanced/cross-field-and-object-constraints.ts` pour un exemple
exécutable complet.

## Contraintes personnalisées

`defineConstraint` (sync) et `defineAsyncConstraint` (async) enregistrent une
contrainte réutilisable une seule fois. Le résultat est **appelable** : il
s'utilise directement comme décorateur (`@MyRule()`, comme les décorateurs
natifs) et se passe **par référence** à `.constraint(...)` côté builder — pas
de chaîne magique, refactor-safe.

```ts
import {defineConstraint, Model, model, numberField} from '@hermiforge-decorix/core';

const EvenNumber = defineConstraint<number, undefined>({
  name: 'evenNumber',
  validate: (value) => typeof value === 'number' && value % 2 === 0,
  message: 'Value must be even.'
});

@Model('CounterDto')
class CounterDto {
  @EvenNumber('Count must be even')
  count!: number;
}

const CounterModel = model('CounterDto', {
  count: numberField().constraint(EvenNumber, 'Count must be even')
});
```

Besoin d'un payload d'options (pas juste un message) ? Utilisez le décorateur
générique `@Constraint(name, options)` ou la forme chaîne du builder,
`.constraint(name, options)` — ces options remontent dans `issue.params`.

Passez un `ConstraintRegistry` dédié en second argument de `defineConstraint`
(et `validate(value, model, { registry })`) pour isoler des contraintes d'un
module ou d'un test du registre global par défaut.

## Validation asynchrone

`validateAsync` résout les contraintes définies avec `defineAsyncConstraint`
(ou `createAsyncConstraint`) ; `validate` (synchrone) **rejette** tout modèle
qui en contient, avec une erreur explicite plutôt qu'un résultat silencieusement
incomplet. Pour du code générique qui ne sait pas à l'avance si un modèle est
async :

```ts
import {createCoreValidatorAdapter, hasAsyncConstraints, runSchemaAsync} from '@hermiforge-decorix/core';

const schema = createCoreValidatorAdapter().createSchema(metadata);
const result = hasAsyncConstraints(metadata)
  ? await runSchemaAsync(schema, value)
  : schema.validate(value);
```

Les adapters runtime (React Hook Form, VeeValidate, TanStack Form, Angular
Signal Forms, Nest) exposent tous un chemin async équivalent
(`validateAsync`, `onSubmitAsync`, `validAsync`, transform asynchrone selon
l'adapter) — voir le README du package concerné.

## Groupes de validation

Une contrainte peut être limitée à un ou plusieurs groupes via l'option
`groups`. Les contraintes sans groupe s'appliquent toujours ; les contraintes
groupées ne s'appliquent que si `options.group` (passé à `validate`/
`validateAsync`) correspond. Utile pour des scénarios « création » vs
« édition » sur le même modèle. Voir
`examples/advanced/nested-and-groups.ts`.

## Traduction des messages natifs

Les messages des contraintes natives sont en anglais par défaut. Enregistrez
un dictionnaire par locale avec `registerLocale` (indexé par nom de
contrainte, ex. `required`, `minLength`, `email`, `min`) et passez `{locale}`
à `validate`/`validateAsync` pour obtenir des messages traduits :

```ts
import {registerLocale, validate} from '@hermiforge-decorix/core';

registerLocale('fr', {
  required: 'Cette valeur est requise.',
  minLength: (min: number) => `La valeur doit contenir au moins ${min} caractères.`,
  email: 'Adresse email invalide.',
  min: (min: number) => `La valeur doit être au moins ${min}.`
});

validate(payload, RegisterUserDto, {locale: 'fr'});
```

Decorix ne fournit que ce mécanisme d'enregistrement, pas une traduction
complète embarquée pour chaque contrainte native — une paire locale/contrainte
sans traduction enregistrée retombe silencieusement sur le message anglais par
défaut, et un message explicite fourni par l'utilisateur
(`.required('Message')` / `@Required('Message')`) prime toujours sur toute
traduction. Voir la section « Locale / i18n » de `packages/core/README.md`
pour l'API complète (`LocaleRegistry`, portée via
`ValidationOptions.localeRegistry`).

## Objets imbriqués et tableaux

Un champ peut référencer un autre modèle Decorix (objet imbriqué) ou un
tableau d'un type primitif/objet. La validation traverse récursivement les
objets et tableaux imbriqués et rapporte des chemins d'erreur complets
(`address.city`, `items.0.name`, ...). Voir
`examples/advanced/nested-and-groups.ts`.
