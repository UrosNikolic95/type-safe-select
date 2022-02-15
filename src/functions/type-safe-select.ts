import { Repository, SelectQueryBuilder } from "typeorm";
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
    joinsHelper.addAllPaths(path);
    const alias = joinsHelper.getAlias(path);
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

  addPath(path: string): void {
    if (!this.obj[path]) {
      this.obj[path] = this.createAlias();
    }
  }

  addAllPaths(arr: string[]): void {
    arr.forEach((el, index) => {
      const keyA = arr.slice(0, index).join() || rootStr;
      this.addPath(keyA);

      const keyB = arr.slice(0, index + 1).join();
      this.addPath(keyB);

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

  addLeftJoin<T>(query: SelectQueryBuilder<T>): void {
    this.allJoins.forEach((el) => {
      query.leftJoin(el.association, el.alias);
    });
  }

  addLeftJoinAndSelect<T>(query: SelectQueryBuilder<T>): void {
    this.allJoins.forEach((el) => {
      query.leftJoinAndSelect(el.association, el.alias);
    });
  }
}
