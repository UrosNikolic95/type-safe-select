import { Repository } from "typeorm";
import { getPath, JoinsHelper } from "./type-safe-select";
import { ConditionNode, ConditionValue, OperatorData, Select } from "./types";

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
  variableHelper = new VariableHelper();
  joinsHelper = new JoinsHelper();

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

  SelectSpecific<result>(
    select: Select<entity, result>,
    where?: ConditionNode<entity>
  ): Promise<result[]> {
    const data = new QueryHelperData();
    const query = this.repo.createQueryBuilder(this.joinsHelper.rootAlias);
    if (where) {
      query.where(
        this.SerializeWhere(where, data),
        this.variableHelper.variables
      );
    }

    const stringSelect = this.getSelectStrings(select, data);
    query.select(stringSelect);

    this.joinsHelper.addLeftJoin(query);

    return query.getRawMany<result>();
  }

  SelectAll(where?: ConditionNode<entity>): Promise<entity[]> {
    const data = new QueryHelperData();
    const query = this.repo.createQueryBuilder(this.joinsHelper.rootAlias);
    if (where) {
      query.where(
        this.SerializeWhere(where, data),
        this.variableHelper.variables
      );
    }
    this.joinsHelper.addLeftJoinAndSelect(query);
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
  private SerializeWhere(
    conditionNode: ConditionNode<entity>,
    data: QueryHelperData
  ) {
    if (this.visited.has(conditionNode)) {
      console.log("Already visited.");
      return;
    }
    this.visited.add(conditionNode);

    this.checkConditionNode(conditionNode);

    const { condition, and, or } = conditionNode;
    if (condition) {
      return this.SerializeSingleCondition(condition, data);
    } else if (and) {
      return this.SerializeConditionsArray(and, " AND ", data);
    } else if (or) {
      return this.SerializeConditionsArray(or, " OR ", data);
    }
  }

  private SerializeSingleCondition(
    condition: ConditionValue<entity>,
    data: QueryHelperData
  ) {
    const { pathGetter, operation } = condition;
    const path = getPath(pathGetter);
    const field = path.pop();

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
        .map((conditionItem) => this.SerializeWhere(conditionItem, data))
        .join(conditionString) +
      ")"
    );
  }
}
