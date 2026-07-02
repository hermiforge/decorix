import './validation/native-constraints';

export type {
    ConditionalFieldOptions,
    ConstraintDefinition,
    ConstraintMetadata,
    CrossFieldPredicate,
    FieldMetadata,
    FieldReferenceOptions,
    FieldType,
    JsonSchemaFragment,
    ModelMetadata,
    ModelTarget,
    ObjectConstraintOptions,
    UiMetadata,
    ValidationContext,
    ValidationIssueInput
} from './metadata/types';
export {cloneFieldMetadata, cloneModelMetadata, isModelMetadata} from './metadata/clone';
export {constraintName, constraintValue, createConstraintMetadata, createInlineObjectConstraintMetadata, createNamedObjectConstraintMetadata, normalizeConstraintOptions}
    from './metadata/constraints';
export type {ObjectConstraintMetadataOptions} from './metadata/constraints';
export {getModelMetadata, hasModelMetadata, registerModelMetadata} from './registry/model-registry';
export {Model, ObjectConstraint} from './decorators/model';
export {
    After,
    RequiredIf,
    NotEqualsField,
    LessThanField,
    LessOrEqualField,
    GreaterThanField,
    GreaterOrEqualField,
    ForbiddenIf,
    EqualsField,
    BeforeField,
    AfterField,
    Before,
    Between,
    BetweenDates,
    Contains,
    Email,
    EndsWith,
    Enum,
    Finite,
    Future,
    FutureOrPresent,
    Integer,
    Length,
    Lowercase,
    Max,
    MaxItems,
    MaxLength,
    Min,
    MinItems,
    MinLength,
    MultipleOf,
    Negative,
    NegativeOrZero,
    NotBlank,
    NotEmpty,
    NotEmptyArray,
    NotNull,
    NotOneOf,
    NotUndefined,
    Nullable,
    OneOf,
    Optional,
    Past,
    PastOrPresent,
    Pattern,
    Positive,
    PositiveOrZero,
    Required,
    Size,
    Slug,
    StartsWith,
    UniqueItems,
    Uppercase,
    Url,
    Uuid
} from './decorators/constraints';
export {Description, Group, Hidden, Label, Order, Placeholder, Readonly} from './decorators/ui';
export type {FieldBuilder} from './builder/field-builders';
export {
    ArrayFieldBuilder,
    BooleanFieldBuilder,
    DateFieldBuilder,
    EnumFieldBuilder,
    NumberFieldBuilder,
    ObjectFieldBuilder,
    StringFieldBuilder,
    arrayField,
    booleanField,
    dateField,
    enumField,
    model,
    numberField,
    objectConstraint,
    objectField,
    stringField
} from './builder/field-builders';
export type {ValidationIssue, ValidationOptions, ValidationResult, ValidatorAdapter, ValidatorAdapterRef, ValidatorSchema} from './validation/types';
export {validate, validateAsync} from './validation/engine';
export {createCoreValidatorAdapter, type CoreValidatorSchema} from './validation/core-adapter';
export {
    ConstraintRegistry,
    createAsyncConstraint,
    createConstraint,
    createObjectConstraint,
    defaultConstraintRegistry,
    getConstraint,
    registerConstraint
} from './validation/constraint-registry';
export {
    getDefaultValidatorAdapter,
    getValidatorAdapter,
    registerValidatorAdapter,
    requireValidatorAdapter,
    resolveValidatorAdapter,
    setDefaultValidatorAdapter
} from './validation/registry';
