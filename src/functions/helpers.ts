import { PathGetter } from "./types";

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
  pathFunc: (el: T) => R,
  depth = 1
): R[] {
  const path = getPath(pathFunc);
  return path.reduce(
    (reduced, field) => {
      const next = reduced[field];
      return Array.isArray(next) ? next.flat(depth).filter((i) => i) : next;
    },
    [obj].flat(depth).filter((i) => i)
  ) as R[];
}
