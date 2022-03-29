export type Flatten<T> = {
  [P in keyof T]: T[P] extends Object
    ? T[P] extends Array<infer el>
      ? Flatten<el>
      : Flatten<T[P]>
    : T[P];
};

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
