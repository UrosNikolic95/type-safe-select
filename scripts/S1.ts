import { getRepository } from "typeorm";
import { TestingHelper } from "../prepare-test";
import { Test1Entity } from "../prepare-test/entities/test1.entitie";
import { QueryHelper } from "../src/main";

console.log(__filename);

async function main() {
  const conn = await TestingHelper.getConnection();
  const repo = getRepository(Test1Entity);

  console.log(
    repo.metadata.tableName,
    repo.metadata.relations.map((el) => el.propertyName),
    repo.metadata.relations.map((el) => el.inverseEntityMetadata.tableName),
    repo.manager.connection.entityMetadatas.map((el) => el.targetName),
    repo.metadata.columns.map((el) => el.propertyName),
    repo.metadata.columns.map((el) => el.type["name"])
  );

  await conn.destroy();
}
main();
