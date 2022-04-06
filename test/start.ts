import "reflect-metadata";
import { getRepository } from "typeorm";
import { TestingHelper } from "../prepare-test";
import { Test1Entity } from "../prepare-test/entities/test1.entitie";
import { Equals, QueryHelper, QueryHelperV2 } from "../src/main";

test("Test 1", async () => {
  const connection = await TestingHelper.getConnection();
  const repo = getRepository(Test1Entity);
  const queryHelper = new QueryHelperV2(repo);

  const result = await queryHelper.selectSpecific(
    {
      selected1: (el) => el.id,
      selected2: (el) => el.test2.id,
      selected3: (el) => el.test2.test1.id,
    },
    {
      condition: {
        pathGetter: (el) => el.test2.test1.id,
        operation: Equals(1),
      },
    }
  );
  result.forEach((res) => {
    expect(res.selected3).toBe(1);
  });
  await connection.close();
});
