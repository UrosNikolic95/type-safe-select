import { getPath } from "./helpers";
import { PathGetter } from "./types";

interface transform<T1, T2> {
  select: {
    [key in keyof T1]: (el: T2) => T1[key];
  };
  unnest: {
    [key in keyof T1]: boolean;
  };
  cast: {
    [key in keyof T1]: "int" | "float" | "text" | "varchar";
  };
}

interface selectLast<T> {
  partitionBy: ((el: T) => any)[];
  orderBy: ((el: T) => any)[];
}

function returnArray(str: string) {
  return `case when json_typeof(${str}) = 'object' then json_build_array(${str}) else ${str} end`;
}

function unnest(str: string) {
  const arr1 = returnArray(str);
  return `json_array_elements(${arr1})`;
}

function jsonPath<T>(getter: PathGetter<T>) {
  const path = getPath(getter);
  const first = path.shift();
  const other = path.map((el) => `'${el}'`);
  const last = other.pop();
  const singleArrow = [first, ...other].join(" -> ");
  const totalPath = [singleArrow, last].join(" ->> ");
  return totalPath;
}

export class SelectHelper<entity> {
  constructor(public selectStr: string) {}

  transformJson<result>(data: transform<result, entity>): SelectHelper<result> {
    const selectRes: string[] = [];
    Object.keys(data.select).forEach((key) => {
      const totalPath = jsonPath(data[key]);

      const unnested = data.unnest[key] ? unnest(totalPath) : totalPath;

      const casted = data.cast[key]
        ? `${unnested}::${data.cast[key]}`
        : unnested;

      selectRes.push(`${casted} AS ${key}`);
    });
    return new SelectHelper<result>(
      `SELECT ${selectRes} from (${this.selectStr}) as t1`
    );
  }

  selectLastFromEachGroup(data: selectLast<entity>) {
    const partitionFIelds = data.partitionBy.map((el) => jsonPath(el));
    const orderFields = data.orderBy
      .map((el) => jsonPath(el))
      .map((el) => `${el} desc`);
    const q1 = `SELECT *, row_number() over (partition by ${partitionFIelds} order by ${orderFields}) as rn from (${this.selectStr}) as t2`;
    const q2 = `SELECT *  from (${q1}) as t3 where rn = 1`;
    return new SelectHelper<entity>(q2);
  }
}
