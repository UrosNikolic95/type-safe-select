import { Flatten, PathGetter } from "./types";

export function getPath<T>(pathFunc: PathGetter<T>): string[] {
  const pathArr: string[] = [];
  const proxy = new Proxy<any>(
    {},
    {
      get: (target: any, key: string, proxy: any) => {
        pathArr.push(key);
        return proxy;
      },
    }
  ) as T;
  pathFunc(proxy);
  return pathArr;
}

export function getField<T>(fieldFunc: PathGetter<T>): string {
  return getPath(fieldFunc).shift();
}

export function getAllValuesFrom<T, R>(
  obj: T,
  pathFunc: (el: Flatten<T>) => R,
  depth = 10
): R[] {
  const path = getPath(pathFunc);
  return path.reduce((reduced: any | any[], field) => {
    return Array.isArray(reduced)
      ? reduced
          .flat(depth)
          .filter((i) => i)
          .map((item) => item[field])
      : reduced[field];
  }, obj) as R[];
}
