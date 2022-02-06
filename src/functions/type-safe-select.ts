import { Repository } from "typeorm";
import { Alias, MappedAliases, StrToStr } from "./interfaces";
import { PathGetter, Select } from "./types";

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

export async function TypeSafeSelect<entity, result>(
  repo: Repository<entity>,
  select: Select<entity, result>
): Promise<result[]> {
  const stringSelect: string[] = [];
  const joinsHelper = new JoinsHelper();
  Object.keys(select).forEach((key) => {
    const path = getPath(select[key]);
    const last = path.pop();
    joinsHelper.add(path);
    const alias = joinsHelper.getAlias(path);
    if (!alias) console.log("!!!", path, last, path.join() == "");
    stringSelect.push(alias + "." + last + " as " + key);
  });

  const query = repo.createQueryBuilder(joinsHelper.rootAlias);
  query.select(stringSelect);
  joinsHelper.allJoins.forEach((el) => {
    query.innerJoin(el.association, el.alias);
  });

  return await query.getRawMany<result>();
}

const rootStr = "root";

export class JoinsHelper {
  private current = 0;
  private obj = {} as StrToStr;
  private joins = {} as MappedAliases;

  constructor() {
    this.obj[rootStr] = this.createAlias();
  }

  createAlias(): string {
    return "alias_" + this.current++;
  }

  add(arr: string[]): void {
    arr.forEach((el, index) => {
      const keyA = arr.slice(0, index).join() || rootStr;
      if (!this.obj[keyA]) {
        this.obj[keyA] = this.createAlias();
      }
      const keyB = arr.slice(0, index + 1).join();
      if (!this.obj[keyB]) {
        this.obj[keyB] = this.createAlias();
      }

      this.joins[this.obj[keyB]] = {
        association: this.obj[keyA] + "." + el,
        alias: this.obj[keyB],
      };
    });
  }

  getAlias(path: string[]): string {
    return this.obj[path.join() || rootStr];
  }

  get rootAlias(): string {
    return this.obj[rootStr];
  }

  get allJoins(): Alias[] {
    return Object.values(this.joins);
  }
}
