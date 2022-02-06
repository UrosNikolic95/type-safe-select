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
