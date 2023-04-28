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
  return path
    .reduce(
      (reduced, field) => {
        return reduced
          .flat(depth)
          .filter((i) => i)
          .map((item) => item[field]);
      },
      [obj]
    )
    .flat(depth) as unknown as R[];
}

export class DecoratorHelper<T> {
  constructor(readonly key: string) {}

  get(obj: any): { [key: string]: T } {
    return Reflect.getMetadata(this.key, obj);
  }

  set(value: T): PropertyDecorator {
    return (obj, property) => {
      const key = property as string;
      const data = this.get(obj);
      if (data) {
        data[key] = value;
      } else {
        Reflect.defineMetadata(this.key, { [key]: value }, obj);
      }
    };
  }
}
