import { Connection, createConnection } from "typeorm";
import { Test1Entity } from "./entities/test1.entitie";
import { Test2Entity } from "./entities/test2.entitie";

export class TestingHelper {
  private static connection: Connection;

  public static async getConnection() {
    if (!TestingHelper.connection) {
      console.log("getConnection");
      TestingHelper.connection = await createConnection({
        type: "postgres",
        host: "localhost",
        port: 5432,
        username: "postgres",
        password: "qwerty",
        database: "test",
        synchronize: true,
        logging: false,
        entities: ["prepare-test/entities/**/*.ts"],
        subscribers: ["prepare-test/subscribers/**/*.ts"],
      });
    }
    return TestingHelper.connection;
  }
}

beforeAll(async () => {
  const test2 = await TestingHelper.getConnection();

  console.log("t2_1");
  const t2_1 = await Test2Entity.create({
    id: 1,
    field1: "A",
  }).save();

  console.log("t1_1");
  const t1_1 = await Test1Entity.create({
    id: 1,
    field1: "A",
    test2_id: t2_1.id,
  } as Test1Entity).save();

  console.log("t1_2");
  const t1_2 = await Test1Entity.create({
    id: 2,
    field1: "B",
    test2_id: t2_1.id,
  } as Test1Entity).save();

  console.log("t1_3");
  const t1_3 = await Test1Entity.create({
    id: 3,
    field1: "C",
    test2_id: t2_1.id,
  } as Test1Entity).save();
}, 10000);
