import { writeFileSync } from "fs";
import { Test1Entity } from "../prepare-test/entities/test1.entity";
import { DataSource } from "typeorm";
import { KeyValue } from "../src/functions/types";

function getColumns(arr: any[]) {
  const allKeys = new Set<string>();
  for (let i1 = 0; i1 < arr.length; i1++) {
    const keys = Object.keys(arr[i1]);
    for (let i2 = 0; i2 < keys.length; i2++) {
      allKeys.add(keys[i2]);
    }
  }
  return Array.from(allKeys);
}

function formatValue(val: any) {
  if (typeof val == "string") return `'${val.replace(/'/g, `''`)}'`;
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (val == null) return "NULL";
  if (val == undefined) return "NULL";
  return val;
}

function values(arr: any[], keys: string[]) {
  return `values ${arr
    .map((el) => `(${keys.map((key) => formatValue(el[key])).join(",")})`)
    .join(",")}`;
}

function uniq<T>(data: T[]) {
  return Array.from(new Set(data));
}

function makeUpdateQuery<T>(data: {
  tableName: String;
  data: Partial<T>[];
  setKeys?: KeyValue<T, boolean>;
  incrementKeys?: KeyValue<T, boolean>;
  whereKeys: KeyValue<T, boolean>;
}) {
  const setKeys = data?.setKeys ? Object.keys(data?.setKeys) : [];
  const whereKeys = data?.whereKeys ? Object.keys(data?.whereKeys) : [];
  const incrementKeys = data?.incrementKeys
    ? Object.keys(data?.incrementKeys)
    : [];
  const keys = uniq([...setKeys, ...whereKeys, ...incrementKeys]);
  const tableName = data?.tableName;
  const valuesAlias = "val";
  const setStr = [
    ...setKeys.map((key) => `${key} = ${valuesAlias}.${key}`),
    ...incrementKeys.map(
      (key) => `${key} = ${tableName}.${key} + ${valuesAlias}.${key}`
    ),
  ].join(", ");
  const fromStr = `(${values(data?.data, keys)}) as ${valuesAlias}(${keys})`;
  const whereStr = whereKeys
    .map((key) => `${tableName}.${key} = ${valuesAlias}.${key}`)
    .join(` AND `);

  return `update ${tableName} 
  set ${setStr}
  from ${fromStr}
  where ${whereStr}`;
}

async function main() {
  const connection = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "qwerty",
    database: "test",
    synchronize: true,
    logging: false,
    entities: ["prepare-test/entities/**/*.ts"],
  });

  await connection.initialize();

  const repo = connection.getRepository(Test1Entity);
  const table_name = repo.metadata.tableName;

  const qb = makeUpdateQuery<Test1Entity>({
    tableName: table_name,
    data: [
      {
        id: 0,
        field1: "1",
        field2: 1,
        test2_id: 1,
      },
      {
        id: 1,
        field1: "1",
        field2: 1,
        test2_id: 1,
      },
      {
        id: 2,
        field1: "1",
        field2: 1,
        test2_id: 1,
      },
      {
        id: 3,
        field1: "1",
        field2: 1,
        test2_id: 1,
      },
    ],
    setKeys: {
      field1: true,
      test2_id: true,
    },
    incrementKeys: {
      field2: true,
    },
    whereKeys: {
      id: true,
    },
  });

  await connection.query(qb).catch(console.error);

  writeFileSync("script-1.sql", qb);

  await connection.destroy();
}
main();
