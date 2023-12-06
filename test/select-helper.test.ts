import { DataSource } from "typeorm";
import { Test3Entity } from "../prepare-test/entities/test3.entity";
import "../src/functions/select-helper";
import { SelectHelper } from "../src/functions/select-helper";
import { TestingHelper } from "../prepare-test";

let connection: DataSource;
beforeAll(async () => {
  connection = await TestingHelper.getConnection();
});

test("select helper test 1", async () => {
  const s1 = new SelectHelper<Test3Entity>({
    table: "entity3",
  });

  const s2 = s1
    .select({
      q1_1: (el) => el.data.f1.f2,
      q1_2: (el) => el.data.f1.f2,
      q2: (el) => el.data.f1,
      q3: (el) => el.id,
      q4: (el) => el.data.date,
    })
    .transform({ unnest: { q1_1: true, q1_2: true } })
    .select({
      s1_1: (el) => el.q1_1.f3.q1,
      s1_2: (el) => el.q1_2.f3.q1,
      s2: (el) => el.q2.f2.f3.q1,
      s3: (el) => el.q3,
      s4: (el) => el.q4,
    })
    .transform({
      cast: {
        s1_1: "int",
        s1_2: "int",
        s2: "int",
        s4: "timestamp",
      },
      notNull: {
        s1_1: true,
      },
    })
    .selectLastFromEachGroup({
      partitionBy: [(el) => el.s1_1],
      orderBy: [(el) => el.s2],
    });

  if (s2.table) {
    const data = await connection.query(s2.table);
    console.log(data);
    console.log({
      s1_1: typeof data[0].s1_1,
      s1_2: typeof data[0].s1_2,
      s2: typeof data[0].s2,
      s3: typeof data[0].s3,
      s4: typeof data[0].s4,
      s4_b: data[0].s4 instanceof Date,
    });
  }

  console.log(s2);
});

afterAll(async () => {
  await connection.destroy();
});
