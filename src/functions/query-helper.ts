import {
  DeepPartial,
  EntityMetadata,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { ConditionNode, ConditionValue, GroupBy, Obj, Select } from "../main";
import { getPath } from "./helpers";
import { Alias } from "./interfaces";
import {
  GroupByQuery,
  GroupBySelect,
  OrderBy,
  SelectSpecific,
  SelectTree,
  SelectTreePaginated,
} from "./types";

const rootStr = "root";

class OneTimeQueryHelper<entity> {
  private aliasCounter = 0;
  private aliasMapping = {} as Obj<string>;
  private joins = {} as Obj<Alias>;
  private variables = {} as Obj<any>;
  private variable_counter = 0;

  constructor(private readonly repo: Repository<entity>) {
    this.initRoot();
  }

  private initRoot() {
    this.aliasMapping[rootStr] = this.createAlias();
  }

  public addVariable(value: unknown): string {
    const variableName = "var_" + this.variable_counter++;
    this.variables[variableName] = value;
    return variableName;
  }

  createAlias(): string {
    return "alias_" + this.aliasCounter++;
  }

  addSeparatePath(path: string[]): string {
    const key = this.getSeparatePathString(path);
    if (!this.aliasMapping[key]) {
      this.aliasMapping[key] = this.createAlias();
    }
    return this.aliasMapping[key];
  }

  addPath(path: string[]): string {
    const key = this.getPathString(path);
    if (!this.aliasMapping[key]) {
      this.aliasMapping[key] = this.createAlias();
    }
    return this.aliasMapping[key];
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

  addSeparateLastField(path: string[]): string {
    this.addAllPaths(path);

    const last = path[path.length - 1];
    const previousAlias = this.getAlias(path.slice(0, path.length - 1));
    const currentAlias = this.addSeparatePath(path);

    this.joins[currentAlias] = {
      association: previousAlias + "." + last,
      alias: currentAlias,
    };
    return currentAlias;
  }

  getPathString(path: string[]): string {
    return [rootStr, ...path].join();
  }

  getSeparatePathString(path: string[]): string {
    return [rootStr, ...path].join() + "_separated";
  }

  getAlias(path: string[]): string {
    return this.aliasMapping[this.getPathString(path)];
  }

  get rootAlias(): string {
    return this.aliasMapping[rootStr];
  }

  get allJoins(): Alias[] {
    return Object.values(this.joins);
  }

  addLeftJoin(query: SelectQueryBuilder<entity>): void {
    this.allJoins.forEach((el) => {
      query.leftJoin(el.association, el.alias);
    });
  }

  addLeftJoinAndSelect(query: SelectQueryBuilder<entity>): void {
    this.allJoins.forEach((el) => {
      query.leftJoinAndSelect(el.association, el.alias);
    });
  }

  private getSelectStrings(select: Select): string[] {
    const stringSelect: string[] = [];
    Object.keys(select).forEach((key) => {
      const path = getPath(select[key]);
      const last = path.pop();
      this.addAllPaths(path);
      const alias = this.getAlias(path);
      stringSelect.push(alias + "." + last + " as " + key);
    });
    return stringSelect;
  }

  private getGroupBy(groupBy: GroupBySelect) {
    const selectStringArr: string[] = [];
    const groupByStringArr: string[] = [];
    Object.keys(groupBy).forEach((key) => {
      const path = getPath(groupBy[key]);
      const first = path.shift();
      if (first == "count") {
        selectStringArr.push("COUNT(*)::int AS " + key);
        return;
      } else if (first == "groupBy") {
        const last = path.pop();
        this.addAllPaths(path);
        const alias = this.getAlias(path);
        const field = alias + "." + last;
        selectStringArr.push(field + " AS " + key);
        groupByStringArr.push(field);
      } else if (first == "sum") {
        const last = path.pop();
        this.addAllPaths(path);
        const alias = this.getAlias(path);
        const field = alias + "." + last;
        selectStringArr.push("SUM(" + field + ")::int AS " + key);
      }
    });
    const groupByStr = groupByStringArr.join(", ");
    return { groupByStr, selectStringArr };
  }

  getWhere(where: ConditionNode<entity>, query: SelectQueryBuilder<entity>) {
    if (where) {
      const whereStr = this.serializeWhere(where);
      query.where(whereStr, this.variables);
    }
  }

  selectGroupBy<result>(
    query: GroupByQuery<entity, result>
  ): Promise<result[]> {
    const { select: select, where } = query;
    const queryBuilder = this.repo.createQueryBuilder(this.rootAlias);

    this.getWhere(where, queryBuilder);

    const { groupByStr, selectStringArr } = this.getGroupBy(select);
    queryBuilder.select(selectStringArr);
    queryBuilder.groupBy(groupByStr);

    this.addLeftJoin(queryBuilder);

    console.log(queryBuilder.getQuery());
    return queryBuilder.getRawMany<result>();
  }

  selectSpecific<result>(
    query: SelectSpecific<entity, result>
  ): Promise<result[]> {
    const { where, select, orderBy, offset, limit } = query;
    const queryBuilder = this.repo.createQueryBuilder(this.rootAlias);

    this.getWhere(where, queryBuilder);

    const stringSelect = this.getSelectStrings(select);
    queryBuilder.select(stringSelect);

    this.addLeftJoin(queryBuilder); //this should be second to last

    if (orderBy)
      Object.keys(orderBy).forEach((key) =>
        queryBuilder.addOrderBy(key, orderBy[key])
      );

    if (offset) queryBuilder.offset(offset);
    if (limit) queryBuilder.limit(limit);

    return queryBuilder.getRawMany<result>();
  }

  selectSpecificTwoStage<result>(query: SelectSpecific<entity, result>) {
    const { where, select } = query;
    const queryBuilderA = this.repo.createQueryBuilder(this.rootAlias);

    this.getWhere(where, queryBuilderA);

    const stringSelect = this.getSelectStrings(select);
    queryBuilderA.select(stringSelect);

    this.addLeftJoin(queryBuilderA); //this should be second to last

    return (orderBy: OrderBy<result>, offset: number, limit: number) => {
      const queryBulderB = queryBuilderA.clone();

      if (orderBy)
        Object.keys(orderBy).forEach((key) =>
          queryBulderB.addOrderBy(key, orderBy[key])
        );

      if (offset) queryBulderB.offset(offset);
      if (limit) queryBulderB.limit(limit);

      return queryBulderB.getRawMany<result>();
    };
  }

  selectAll(where?: ConditionNode<entity>): Promise<entity[]> {
    const query = this.repo.createQueryBuilder(this.rootAlias);

    this.getWhere(where, query);
    this.addLeftJoinAndSelect(query);
    return query.getMany();
  }

  getManyQuery(query: DeepPartial<SelectTree<entity>>) {
    const qb = this.repo.createQueryBuilder(this.rootAlias);
    qb.select([]);
    this.selectSpecificRecursive(
      qb,
      this.repo.metadata,
      this.rootAlias,
      query.where
    );
    qb.setParameters(this.variables);
    if (query.skip) qb.skip(query.skip);
    if (query.take) qb.take(query.take);
    return qb;
  }

  selectSpecificRecursive(
    qb: SelectQueryBuilder<entity>,
    meta: EntityMetadata,
    alias: string,
    obj: any
  ) {
    Object.keys(obj).forEach((field) => {
      const column = meta.columns.find((el) => el.propertyName == field);

      if (column) {
        qb.addSelect(`${alias}.${field}`);
        if (obj[field] != "*") {
          const varName = this.addVariable(obj[field]);
          if (Array.isArray(obj[field]))
            qb.andWhere(`${alias}.${field} in (:...${varName})`);
          else qb.andWhere(`${alias}.${field} = :${varName}`);
        }
      }
      const relation = meta.relations.find((el) => el.propertyName == field);
      if (relation) {
        const newAlias = this.createAlias();
        qb.leftJoin(`${alias}.${field}`, newAlias);
        const other =
          relation.entityMetadata.target == meta.target
            ? relation.inverseEntityMetadata
            : relation.entityMetadata;
        this.selectSpecificRecursive(qb, other, newAlias, obj[field]);
      }
    });
  }

  private checkConditionNode(conditionNode: ConditionNode<entity>): void {
    const propNum = Object.keys(conditionNode).length;
    if (propNum > 1) {
      throw new Error(
        "Condition node is not allowed to have more than 1 property. It has " +
          propNum +
          ". They are: " +
          Object.keys(conditionNode) +
          "."
      );
    }
    if (propNum == 0) {
      throw new Error(
        "Condition node is not allowed to be without any fields. It should have exatly one."
      );
    }
  }

  private visited: Set<Object> = new Set<Object>();
  private serializeWhere(conditionNode: ConditionNode<entity>) {
    if (this.visited.has(conditionNode)) {
      console.log("Already visited.");
      return null;
    }
    this.visited.add(conditionNode);

    this.checkConditionNode(conditionNode);

    const { condition, and, or } = conditionNode;
    if (condition) {
      return this.serializeSingleCondition(condition);
    } else if (and) {
      return this.SerializeConditionsArray(and, " AND ");
    } else if (or) {
      return this.SerializeConditionsArray(or, " OR ");
    }
  }

  private serializeSingleCondition(condition: ConditionValue<entity>) {
    const { pathGetter, operation } = condition;
    const path = getPath(pathGetter);
    const field = path.pop();
    if (!field) {
      throw new Error("Getter has to have at least one field.");
    }

    this.addAllPaths(path);
    const alias = this.getAlias(path);

    const { value, stringMaker } = operation;

    const variableName = this.addVariable(value);

    return stringMaker(alias, field, variableName);
  }

  private SerializeConditionsArray(
    conditionNode: ConditionNode<entity>[],
    conditionString: string
  ): string {
    return (
      "(" +
      conditionNode
        .map((conditionItem) => this.serializeWhere(conditionItem))
        .join(conditionString) +
      ")"
    );
  }
}

export class QueryHelper<entity> {
  constructor(private readonly repo: Repository<entity>) {}

  selectSpecific<result>(query: SelectSpecific<entity, result>) {
    const oneTime = new OneTimeQueryHelper(this.repo);
    return oneTime.selectSpecific(query);
  }

  getMany(query: SelectTree<entity>) {
    const oneTime = new OneTimeQueryHelper(this.repo);
    return oneTime.getManyQuery(query).getMany();
  }

  getManyAndCount(query: SelectTree<entity>) {
    const oneTime = new OneTimeQueryHelper(this.repo);
    return oneTime.getManyQuery(query).getManyAndCount();
  }

  async getManyPaginated(query: SelectTreePaginated<entity>) {
    const { pageSize = 10, pageNumber = 1, where } = query;
    const take = pageSize;
    const skip = (pageNumber - 1) * pageSize;
    const oneTime = new OneTimeQueryHelper(this.repo);
    const [items, count] = await oneTime
      .getManyQuery({
        where,
        skip,
        take,
      })
      .getManyAndCount();
    return {
      count,
      pageSize,
      pageNumber,
      maxPages: Math.ceil(count / pageSize),
      items,
    };
  }

  selectGroupBy<result>(query: GroupByQuery<entity, result>) {
    const oneTime = new OneTimeQueryHelper(this.repo);
    return oneTime.selectGroupBy(query);
  }
}
