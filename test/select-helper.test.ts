import { DataSource } from "typeorm";
import { Test3Entity } from "../prepare-test/entities/test3.entity";
import "../src/functions/select-helper";
import { JsonSelectHelper } from "../src/functions/select-helper";
import { TestingHelper } from "../prepare-test";

let connection: DataSource;
beforeAll(async () => {
  connection = await TestingHelper.getConnection();
});

test("select helper test 1", async () => {
  const s1 = new JsonSelectHelper<Test3Entity>({
    table: "entity3",
  });

  const s2 = s1
    .jsonSelect({
      q1: {
        path: (el) => el.id,
        cast: "int",
      },
      q2: {
        path: (el) => el.data.f1.f2,
        unnest: true,
      },
      q3: {
        path: (el) => el.data.date,
        cast: "timestamp",
      },
    })
    .jsonSelect({
      s1: {
        path: (el) => el.q1,
      },
      s2: {
        path: (el) => el.q2.f3.q1,
        notNull: true,
      },
      s3: {
        path: (el) => el.q3,
      },
    });

  const s3 = s1.unionAll([
    s2.jsonSelect({
      e1: {
        path: (el) => el.s1,
      },
    }),
    s2.jsonSelect({
      e1: {
        path: (el) => el.s1,
      },
    }),
  ]);
});

afterAll(async () => {
  await connection.destroy();
});
