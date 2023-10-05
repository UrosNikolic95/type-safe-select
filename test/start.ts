import "reflect-metadata";
import { Connection, DataSource, getRepository } from "typeorm";
import { TestingHelper } from "../prepare-test";
import { Test1Entity } from "../prepare-test/entities/test1.entitie";
import { Equals, QueryHelper } from "../src/main";
import { writeFileSync } from "fs";

let connection: DataSource;
beforeAll(async () => {
  connection = await TestingHelper.getConnection();
});

test("Test 1", async () => {
  const repo = connection.getRepository(Test1Entity);
  const queryHelper = new QueryHelper(repo);

  const result = await queryHelper.selectSpecific({
    select: {
      selected1: (el) => el.id,
      selected2: (el) => el.test2.id,
      selected3: (el) => el.test2.test1.id,
    },
    where: {
      condition: {
        pathGetter: (el) => el.test2.test1.id,
        operation: Equals(1),
      },
    },
  });

  result.forEach((res) => {
    expect(res.selected3).toBe(1);
  });
});

test("Test 2", async () => {
  const repo = connection.getRepository(Test1Entity);
  const queryHelper = new QueryHelper(repo);

  const result = await queryHelper.selectGroupBy({
    select: {
      selected1: (el) => el.groupBy.field1,
      selected2: (el) => el.groupBy.field2,
      count1: (el) => el.count,
      sum1: (el) => el.sum.field2,
    },
    where: {
      condition: {
        pathGetter: (el) => el.field1,
        operation: Equals("D"),
      },
    },
  });
  console.log(result);
  expect(result.length).toBe(2);
});

test("Test 3", async () => {
  const repo = connection.getRepository(Test1Entity);
  const queryHelper = new QueryHelper(repo);
  const n = 3;

  const result = await queryHelper.selectSpecific({
    select: {
      selected1: (el) => el.id,
      selected2: (el) => el.test2.id,
      selected3: (el) => el.test2.test1.id,
    },
    limit: n,
  });
  console.log(result);
  expect(result.length).toBe(n);
});

test("Test 4", async () => {
  const repo = connection.getRepository(Test1Entity);
  const queryHelper = new QueryHelper(repo);

  const result = await queryHelper.selectSpecificTree({
    where: {
      id: 1,
      test2: {
        id: 1,
      },
    },
  });
  console.log(result);
  writeFileSync("view.json", JSON.stringify(result));
  expect(result.length).toBeDefined();
});

afterAll(async () => {
  const connection = await TestingHelper.getConnection();
  await connection.destroy();
});
