import { Repository } from "typeorm";
import { getPath, JoinsHelper } from "./type-safe-select";
import {
  ConditionNode,
  ConditionValue,
  GroupBy,
  GroupByAndSelect,
  OperatorData,
  Select,
} from "./types";

export function Equals<T>(value: T): OperatorData<T> {
  return {
    value,
    stringMaker: (alias, field, varName) => `${alias}.${field} = :${varName}`,
  };
}

export function Like<T>(value: T): OperatorData<T> {
  return {
    value,
    stringMaker: (alias, field, varName) =>
      `${alias}.${field} LIKE (:${varName})`,
  };
}

export function ILike<T>(value: T): OperatorData<T> {
  return {
    value,
    stringMaker: (alias, field, varName) =>
      `${alias}.${field} ILIKE (:${varName})`,
  };
}

export function LessThan<T>(value: T): OperatorData<T> {
  return {
    value,
    stringMaker: (alias, field, varName) => `${alias}.${field} < :${varName}`,
  };
}

export function MoreThan<T>(value: T): OperatorData<T> {
  return {
    value,
    stringMaker: (alias, field, varName) => `${alias}.${field} > :${varName}`,
  };
}

export class TypedEmptyObject<T> {
  [key: string]: T;
}

export interface Obj<T> {
  [key: string]: T;
}

export class VariableHelper {
  public variables = new TypedEmptyObject<any>();
  private variable_counter = 0;

  public addVariable(value: unknown): string {
    const variableName = "var_" + this.variable_counter++;
    this.variables[variableName] = value;
    return variableName;
  }
}

export class QueryHelperData {
  public variableHelper = new VariableHelper();
  public joinsHelper = new JoinsHelper();
}

export class QueryHelper<entity> {
  constructor(private readonly repo: Repository<entity>) {}

  private getSelectStrings<entity, result>(
    select: Select<entity, result>,
    data: QueryHelperData
  ): string[] {
    const stringSelect: string[] = [];
    Object.keys(select).forEach((key) => {
      const path = getPath(select[key]);
      const last = path.pop();
      data.joinsHelper.addAllPaths(path);
      const alias = data.joinsHelper.getAlias(path);
      stringSelect.push(alias + "." + last + " as " + key);
    });
    return stringSelect;
  }

  private getGroupBy<entity, result>(
    groupBy: GroupBy<entity, result>,
    data: QueryHelperData
  ): string[] {
    const stringSelect: string[] = [];
    Object.keys(groupBy).forEach((key) => {
      const path = getPath(groupBy[key]);
      const last = path.pop();
      data.joinsHelper.addAllPaths(path);
      const alias = data.joinsHelper.getAlias(path);
      stringSelect.push(alias + "." + last);
    });
    return stringSelect;
  }

  separateGroupBy(groupByAndSelect: GroupByAndSelect): GroupBy {
    const groupBy = {} as GroupBy;
    Object.keys(groupByAndSelect).forEach((key) => {
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

  selectGroupBy<result>(
    groupByAndSelect: GroupByAndSelect<entity, result>,
    where?: ConditionNode<entity>
  ): Promise<result[]> {
    const data = new QueryHelperData();
    const query = this.repo.createQueryBuilder(data.joinsHelper.rootAlias);

    const groupBy = this.separateGroupBy(groupByAndSelect);
    const select = this.separateSelect(groupByAndSelect);

    if (where) {
      const whereStr = this.serializeWhere(where, data);
      if (whereStr) query.where(whereStr, data.variableHelper.variables);
    }

    const stringSelect = this.getSelectStrings(select, data);
    query.select(stringSelect);
    const stringGroupBy = this.getGroupBy(groupBy, data);
    stringGroupBy.forEach((term) => query.addGroupBy(term));

    data.joinsHelper.addLeftJoin(query);

    return query.getRawMany<result>();
  }

  selectSpecific<result>(
    select: Select<entity, result>,
    where?: ConditionNode<entity>
  ): Promise<result[]> {
    const data = new QueryHelperData();
    const query = this.repo.createQueryBuilder(data.joinsHelper.rootAlias);
    if (where) {
      const whereStr = this.serializeWhere(where, data);
      if (whereStr) query.where(whereStr, data.variableHelper.variables);
    }

    const stringSelect = this.getSelectStrings(select, data);
    query.select(stringSelect);

    data.joinsHelper.addLeftJoin(query);

    return query.getRawMany<result>();
  }

  selectAll(where?: ConditionNode<entity>): Promise<entity[]> {
    const data = new QueryHelperData();
    const query = this.repo.createQueryBuilder(data.joinsHelper.rootAlias);
    if (where) {
      const whereStr = this.serializeWhere(where, data);
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
  private serializeWhere(
    conditionNode: ConditionNode<entity>,
    data: QueryHelperData
  ) {
    if (this.visited.has(conditionNode)) {
      console.log("Already visited.");
      return null;
    }
    this.visited.add(conditionNode);

    this.checkConditionNode(conditionNode);

    const { condition, and, or } = conditionNode;
    if (condition) {
      return this.serializeSingleCondition(condition, data);
    } else if (and) {
      return this.SerializeConditionsArray(and, " AND ", data);
    } else if (or) {
      return this.SerializeConditionsArray(or, " OR ", data);
    }
  }

  private serializeSingleCondition(
    condition: ConditionValue<entity>,
    data: QueryHelperData
  ) {
    const { pathGetter, operation } = condition;
    const path = getPath(pathGetter);
    const field = path.pop();
    if (!field) {
      throw new Error("Getter has to have at least one field.");
    }

    data.joinsHelper.addAllPaths(path);
    const alias = data.joinsHelper.getAlias(path);

    const { value, stringMaker } = operation;

    const variableName = data.variableHelper.addVariable(value);

    return stringMaker(alias, field, variableName);
  }

  private SerializeConditionsArray(
    conditionNode: ConditionNode<entity>[],
    conditionString: string,
    data: QueryHelperData
  ): string {
    return (
      "(" +
      conditionNode
        .map((conditionItem) => this.serializeWhere(conditionItem, data))
        .join(conditionString) +
      ")"
    );
  }
}
