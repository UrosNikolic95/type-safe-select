import { DataSource } from "typeorm";
import { getPath } from "./helpers";
import { Flatten, PathGetter } from "./types";

type dataType<input, output> = {
  path: (el: input) => output;
  unnest?: boolean;
  cast?: "int" | "float" | "text" | "varchar" | "timestamp";
  notNull?: boolean;
};

type jsonSelectType<input, output> = {
  [key in keyof output]?: dataType<input, output[key]>;
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

export class JsonSelectHelper<input> {
  alias = getLabel();
  table?: string;
  columns?: string[];

  constructor(data: Partial<JsonSelectHelper<any>>) {
    Object.assign(this, data);
  }

  jsonSelect<output>(selectParam: jsonSelectType<input, output>) {
    const where: string[] = [];
    const selectRes: string[] = [];
    Object.keys(selectParam).forEach((key) => {
      const data = selectParam[key] as dataType<input, output>;
      const totalPath = jsonPath(data.path);
      const unnested = data.unnest ? unnest(totalPath) : totalPath;
      const casted = data?.cast
        ? `((${unnested})::text)::${data?.cast}`
        : unnested;
      if (data.notNull) where.push(`${unnested} is not null`);
      selectRes.push(`${casted} AS ${key}`);
    });
    const whereStr = where.length ? "where " + where.join(" AND ") : "";
    const from = this.table.toLocaleLowerCase().includes("select")
      ? `(${this.table})`
      : this.table;
    return new JsonSelectHelper<Flatten<output>>({
      table: `SELECT ${selectRes} from ${from} as ${this.alias}  ${whereStr}`,
      columns: Object.keys(selectParam),
    });
  }

  selectData(dataSource: DataSource): Promise<input[]> {
    return dataSource.query(this.table);
  }

  unionAll<input>(selectHelpers: JsonSelectHelper<input>[]) {
    return new JsonSelectHelper<input>({
      table: selectHelpers.map((el) => el.table).join(" UNION ALL "),
    });
  }

  selectLastFromEachGroup(data: selectLast<input>) {
    const partitionFIelds = data.partitionBy.map((el) => jsonPath(el));
    const orderFields = data.orderBy
      .map((el) => jsonPath(el))
      .map((el) => `${el} desc`);
    const q1 = `SELECT ${this.columns}, row_number() over (partition by ${partitionFIelds} order by ${orderFields}) as rn from (${this.table}) as ${this.alias}`;
    const q2 = `SELECT ${this.columns} from (${q1}) as ${this.alias} where rn = 1`;
    return new JsonSelectHelper<input>({
      table: q2,
    });
  }
}
