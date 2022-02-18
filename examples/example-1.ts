import { getRepository } from "typeorm";
import { Test1Entity } from "../prepare-test/entities/test1.entitie";
import { QueryHelper } from "../src/main";

async function FirstExample() {
  const repo = getRepository(Test1Entity);

  const queryHelper = new QueryHelper(repo);

  const found = await queryHelper.SelectSpecific(
    {
      field1: (el) => el.test2.test1.id,
      field2: (el) => el.test2.id,
      field3: (el) => el.id,
    },
    {
      and: [
        {
          or: [
            {
              condition: {
                pathGetter: (el) => el.field1,
                operation: {
                  value: 1,
                  stringMaker: (alias, field, varName) =>
                    `${alias}.${field} < ${varName}`,
                },
              },
            },
            {
              condition: {
                pathGetter: (el) => el.field1,
                operation: {
                  value: 0,
                  stringMaker: (alias, field, varName) =>
                    `${alias}.${field} > ${varName}`,
                },
              },
            },
          ],
        },
        {
          condition: {
            pathGetter: (el) => el.test2.test1,
            operation: {
              value: 1,
              stringMaker: (alias, field, varName) =>
                `${alias}.${field} = ${varName}`,
            },
          },
        },
      ],
    }
  );
}

setTimeout(FirstExample, 1000);
