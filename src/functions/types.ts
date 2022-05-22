export type Flatten<T> = F1<F2<T>>;

export type F1<T> = {
  [P in keyof T]: T[P] extends Object ? Flatten<T[P]> : T[P];
};

export type F2<T> = T extends Array<infer el> ? F2<el> : T;

export type Select<entity = any, result = any> = {
  [property in keyof result]: (el: Flatten<entity>) => result[property];
};

export type GroupBy<entity = any, result = any> = Select<entity, result>;

export type GroupByAndSelectSigular<entity = any, returnValue = any> = {
  groupBy: (el: Flatten<entity>) => returnValue;
  select: boolean;
};

export type GroupByAndSelect<entity = any, result = any> = {
  [property in keyof result]: GroupByAndSelectSigular<entity, result>;
};

export type PathGetter<T> = (el: T) => void;

export type ConditionNode<T> = {
  and?: ConditionNode<T>[];
  or?: ConditionNode<T>[];
  condition?: ConditionValue<T>;
};

export type OperatorData<T> = { value: T; stringMaker: StringMaker };
export type StringMaker = (
  alias: string,
  field: string,
  varName: string
) => string;

export type ConditionValue<T> = {
  pathGetter: PathGetter<Flatten<T>>;
  operation: OperatorData<unknown>;
};

export type OnlyPropertiesWithType<ObjectType, PropertyType> = {
  [key in keyof ObjectType as ObjectType[key] extends PropertyType
    ? key
    : never]: ObjectType[key];
};

export type ExeptPropertiesWithType<ObjectType, PropertyType> = {
  [key in keyof ObjectType as ObjectType[key] extends PropertyType
    ? never
    : key]: ObjectType[key];
};

export type SelectSpecific<entity, result> = {
  select: Select<entity, result>;
  where?: ConditionNode<entity>;
};

export type GroupByOperation<entity> = {
  groupBy: entity;
  sum: entity;
  count: number;
};

export type GroupBySelect<entity = any, result = any> = {
  [property in keyof result]: (
    el: GroupByOperation<entity>
  ) => result[property];
};

export type GroupByQuery<entity = any, result = any> = {
  select: GroupBySelect<entity, result>;
  where?: ConditionNode<entity>;
};
