import { Repository, SelectQueryBuilder } from "typeorm";
import { Alias, MappedAliases, StrToStr } from "./interfaces";
import { QueryHelperData } from "./query-helper";
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

  addPath(path: string[]): string {
    const key = this.getPathString(path);
    if (!this.obj[key]) {
      this.obj[key] = this.createAlias();
    }
    return this.obj[key];
  }

  addAllPaths(path: string[]): void {
    path.forEach((field, index) => {
      const pathA = path.slice(0, index);
      const keyA = this.addPath(pathA);

      const pathB = path.slice(0, index + 1);
      const keyB = this.addPath(pathB);

      this.joins[keyB] = {
        association: keyA + "." + field,
        alias: keyB,
      };
    });
  }

  addSeparateLastField(path: string[]): void {
    this.addAllPaths(path);

    const last = path.pop();
    const previousAlias = this.getAlias(path);
    const currentAlias = this.addPath([...path, last + "_separated"]);

    this.joins[currentAlias] = {
      association: previousAlias + "." + last,
      alias: currentAlias,
    };
  }

  getPathString(path: string[]): string {
    return path.join() || rootStr;
  }

  getAlias(path: string[]): string {
    return this.obj[this.getPathString(path)];
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

export const searchStr = "search";

export function SetSearch<T>(pathGetter: PathGetter<T>): PropertyDecorator {
  return (target, property) => {
    Reflect.defineMetadata(searchStr, pathGetter, target, property);
  };
}

type Type = Function;

export function getSearch<entity>(
  object: Object,
  dtoType: Type,
  queryHelper: QueryHelperData,
  query: SelectQueryBuilder<entity>
): void {
  const target = dtoType.prototype;
  const conditionsStrings = Object.keys(object).map((property) => {
    const pathGetter = Reflect.getMetadata(
      searchStr,
      target,
      property
    ) as PathGetter<entity>;
    if (pathGetter) {
      const path = getPath(pathGetter);
      const last = path.pop();
      queryHelper.joinsHelper.addAllPaths(path);
      const alias = queryHelper.joinsHelper.getAlias(path);
      const varName = queryHelper.variableHelper.addVariable(object[property]);
      return `${alias}.${last} IN (:...${varName})`;
    }
  });
  const condition = "(" + conditionsStrings.join(" AND ") + ")";
  query.andWhere(condition, queryHelper.variableHelper.variables);
}
