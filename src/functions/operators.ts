import { OperatorData } from "./types";

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
