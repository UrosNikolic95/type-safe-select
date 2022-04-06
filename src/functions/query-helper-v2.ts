import { Repository, SelectQueryBuilder } from "typeorm";
import {
  ConditionNode,
  ConditionValue,
  getPath,
  GroupBy,
  GroupByAndSelect,
  Obj,
  QueryHelperData,
  Select,
} from "../main";
import { StrToStr, MappedAliases, Alias } from "./interfaces";

const rootStr = "root";

export class QueryHelperV2<entity> {
  private current = 0;
  private obj = {} as StrToStr;
  private joins = {} as MappedAliases;
  private variables = {} as Obj<any>;
  private variable_counter = 0;
  private stringSelect: string[] = [];
  private stringGroupBy: string[] = [];
  private query: SelectQueryBuilder<entity>;
  private groupBy = {} as GroupBy;
  private select = {} as Select;

  constructor(private readonly repo: Repository<entity>) {}

  public addVariable(value: unknown): string {
    const variableName = "var_" + this.variable_counter++;
    this.variables[variableName] = value;
    return variableName;
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

  private getSelectStrings(): void {
    Object.keys(this.select).forEach((key) => {
      const path = getPath(this.select[key]);
      const last = path.pop();
      this.addAllPaths(path);
      const alias = this.getAlias(path);
      this.stringSelect.push(alias + "." + last + " as " + key);
    });
  }

  private getGroupBy(): void {
    Object.keys(this.groupBy).forEach((key) => {
      const path = getPath(this.groupBy[key]);
      const last = path.pop();
      this.addAllPaths(path);
      const alias = this.getAlias(path);
      this.stringGroupBy.push(alias + "." + last);
    });
  }

  separateGroupBy(groupByAndSelect: GroupByAndSelect): void {
    Object.keys(groupByAndSelect).forEach((key) => {
      this.groupBy[key] = groupByAndSelect[key].groupBy;
    });
  }

  separateSelect(groupByAndSelect: GroupByAndSelect): void {
    Object.keys(groupByAndSelect)
      .filter((key) => groupByAndSelect[key].select)
      .forEach((key) => {
        this.select[key] = groupByAndSelect[key].groupBy;
      });
  }

  addWhere(where: ConditionNode<entity>) {
    if (where) {
      const whereStr = this.serializeWhere(where);
      this.query.where(whereStr, this.variables);
    }
  }

  selectGroupBy<result>(
    groupByAndSelect: GroupByAndSelect<entity, result>,
    where?: ConditionNode<entity>
  ): Promise<result[]> {
    this.query = this.repo.createQueryBuilder(this.rootAlias);

    this.separateGroupBy(groupByAndSelect);
    this.separateSelect(groupByAndSelect);
    this.addWhere(where);

    this.getSelectStrings();
    this.query.select(this.stringSelect);
    this.getGroupBy();
    this.stringGroupBy.forEach((term) => this.query.addGroupBy(term));

    this.addLeftJoin(this.query);

    return this.query.getRawMany<result>();
  }

  selectSpecific<result>(
    select: Select<entity, result>,
    where?: ConditionNode<entity>
  ): Promise<result[]> {
    this.select = select;

    const query = this.repo.createQueryBuilder(this.rootAlias);
    if (where) {
      const whereStr = this.serializeWhere(where);
      if (whereStr) query.where(whereStr, this.variables);
    }

    this.getSelectStrings();
    query.select(this.stringSelect);

    this.addLeftJoin(query);

    return query.getRawMany<result>();
  }

  selectAll(where?: ConditionNode<entity>): Promise<entity[]> {
    const data = new QueryHelperData();
    const query = this.repo.createQueryBuilder(data.joinsHelper.rootAlias);
    if (where) {
      const whereStr = this.serializeWhere(where);
      if (whereStr) query.where(whereStr, data.variableHelper.variables);
    }
    data.joinsHelper.addLeftJoinAndSelect(query);
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
