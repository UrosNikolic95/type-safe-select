import { Repository, SelectQueryBuilder } from "typeorm";
import {
  ConditionNode,
  ConditionValue,
  getPath,
  GroupBy,
  GroupByAndSelect,
  Obj,
  Select,
} from "../main";
import { Alias } from "./interfaces";

const rootStr = "root";

export class QueryHelperV2<entity> {
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

  private getGroupBy(groupBy: GroupBy): string[] {
    const stringGroupBy: string[] = [];
    Object.keys(groupBy).forEach((key) => {
      const path = getPath(groupBy[key]);
      const last = path.pop();
      this.addAllPaths(path);
      const alias = this.getAlias(path);
      stringGroupBy.push(alias + "." + last);
    });
    return stringGroupBy;
  }

  separateGroupBy(groupByAndSelect: GroupByAndSelect): GroupBy {
    const groupBy = {} as GroupBy;
    Object.keys(groupByAndSelect).map((key) => {
      groupBy[key] = groupByAndSelect[key].groupBy;
    });
    return groupBy;
  }

  separateSelect(groupByAndSelect: GroupByAndSelect): Select {
    const select = {} as Select;
    Object.keys(groupByAndSelect)
      .filter((key) => groupByAndSelect[key].select)
      .forEach((key) => {
        select[key] = groupByAndSelect[key].groupBy;
      });
    return select;
  }

  getWhere(where: ConditionNode<entity>, query: SelectQueryBuilder<entity>) {
    if (where) {
      const whereStr = this.serializeWhere(where);
      query.where(whereStr, this.variables);
    }
  }

  selectGroupBy<result>(
    groupByAndSelect: GroupByAndSelect<entity, result>,
    where?: ConditionNode<entity>
  ): Promise<result[]> {
    const query = this.repo.createQueryBuilder(this.rootAlias);

    const groupBy = this.separateGroupBy(groupByAndSelect);
    const select = this.separateSelect(groupByAndSelect);
    this.getWhere(where, query);

    const stringSelect = this.getSelectStrings(select);
    query.select(stringSelect);
    const stringGroupBy = this.getGroupBy(groupBy);
    stringGroupBy.forEach((term) => query.addGroupBy(term));

    this.addLeftJoin(query);

    return query.getRawMany<result>();
  }

  selectSpecific<result>(
    select: Select<entity, result>,
    where?: ConditionNode<entity>
  ): Promise<result[]> {
    const query = this.repo.createQueryBuilder(this.rootAlias);

    this.getWhere(where, query);

    const stringSelect = this.getSelectStrings(select);
    query.select(stringSelect);

    this.addLeftJoin(query);

    return query.getRawMany<result>();
  }

  selectAll(where?: ConditionNode<entity>): Promise<entity[]> {
    const query = this.repo.createQueryBuilder(this.rootAlias);

    this.getWhere(where, query);
    this.addLeftJoinAndSelect(query);
    return query.getMany();
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
