export type Flatten<T> = {
  [P in keyof T]: T[P] extends Object
    ? T[P] extends Array<infer el>
      ? Flatten<el>
      : Flatten<T[P]>
    : T[P];
};

export type Select<entity, result> = {
  [property in keyof result]: (el: Flatten<entity>) => result[property];
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
