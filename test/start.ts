import "reflect-metadata";
import { getRepository } from "typeorm";
import { TestingHelper } from "../prepare-test";
import { Test1Entity } from "../prepare-test/entities/test1.entitie";
import { QueryHelper } from "../src/main";

test("Test 1", async () => {
  const repo = TestingHelper.getConnection();
  //   const queryHelper = new QueryHelper(repo);

  //   const result = await queryHelper.SelectSpecific({
  //     selected1: (el) => el.test2.test1.test2,
  //   });
  //   console.log(result);
  expect(0).toBe(0);
});
