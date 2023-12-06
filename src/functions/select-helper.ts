import { getPath } from "./helpers";
import { Flatten, PathGetter } from "./types";

type columns<T1 = any> = {
  [key in keyof T1]?: boolean;
};

type castType<T1 = any> = {
  [key in keyof T1]?: "int" | "float" | "text" | "varchar" | "timestamp";
};

type selectType<T1 = any, T2 = any> = {
  [key in keyof T1]?: (el: T2) => T1[key];
};

type transform<T1> = {
  unnest?: columns<T1>;
  cast?: castType<T1>;
  notNull?: columns<T1>;
};

interface selectLast<T> {
  partitionBy: ((el: T) => any)[];
  orderBy: ((el: T) => any)[];
}

function returnArray(str: string) {
  return `case when json_typeof(${str}) != 'array' then json_build_array(${str}) else ${str} end`;
}

function unnest(str: string) {
  const arr1 = returnArray(str);
  return `json_array_elements(${arr1})`;
}

function jsonPath<T>(getter: PathGetter<T>) {
  const path = getPath(getter);
  const first = path.shift();
  const other = path.map((el) => `'${el}'`);
  const singleArrow = [first, ...other].join(" -> ");
  return singleArrow;
}

let labelCounter = 0;

function getLabel() {
  return "label_" + labelCounter++;
}

export class SelectHelper<input> {
  alias = getLabel();
  table?: string;
  columns?: string[];

  constructor(data: Partial<SelectHelper<any>>) {
    Object.assign(this, data);
  }

  select<output>(selectParam: selectType<output, input>) {
    const selectRes: string[] = [];
    Object.keys(selectParam).forEach((key) => {
      const totalPath = jsonPath(selectParam[key]);

      selectRes.push(`${totalPath} AS ${key}`);
    });
    const from = this.table.toLocaleLowerCase().includes("select")
      ? `(${this.table})`
      : this.table;
    return new SelectHelper<output>({
      table: `SELECT ${selectRes} from ${from} as ${this.alias}`,
      columns: Object.keys(selectParam),
    });
  }

  transform(transform: transform<input>) {
    const selectRes: string[] = [];
    const where: string[] = [];
    this.columns.forEach((column) => {
      const unnested = transform?.unnest?.[column] ? unnest(column) : column;

      const casted = transform?.cast?.[column]
        ? `${unnested}::text::${transform?.cast?.[column]}`
        : unnested;

      if (transform.notNull?.[column]) where.push(`${unnested} is not null`);

      selectRes.push(`${casted} AS ${column}`);
    });
    const from = this.table.toLocaleLowerCase().includes("select")
      ? `(${this.table})`
      : this.table;
    const whereStr = transform?.notNull ? "where " + where.join(" AND ") : "";
    return new SelectHelper<Flatten<input>>({
      table: `SELECT ${selectRes} from ${from} as ${this.alias} ${whereStr}`,
      columns: this.columns,
    });
  }

  selectLastFromEachGroup(data: selectLast<input>) {
    const partitionFIelds = data.partitionBy.map((el) => jsonPath(el));
    const orderFields = data.orderBy
      .map((el) => jsonPath(el))
      .map((el) => `${el} desc`);
    const q1 = `SELECT ${this.columns}, row_number() over (partition by ${partitionFIelds} order by ${orderFields}) as rn from (${this.table}) as ${this.alias}`;
    const q2 = `SELECT ${this.columns} from (${q1}) as ${this.alias} where rn = 1`;
    return new SelectHelper<input>({
      table: q2,
    });
  }
}
