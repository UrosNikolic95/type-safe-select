import { DataSource } from "typeorm";
import { Test1Entity } from "./entities/test1.entity";
import { Test2Entity } from "./entities/test2.entity";
import { Test3View } from "./entities/test3-view.entity";
// import { Test3View } from "./entities/test3-view.entity";

export class TestingHelper {
  private static connection: DataSource;

  public static async getConnection() {
    if (!TestingHelper.connection) {
      TestingHelper.connection = new DataSource({
        type: "postgres",
        host: "localhost",
        port: 5432,
        username: "postgres",
        password: "qwerty",
        database: "test",
        synchronize: true,
        logging: false,
        entities: [Test1Entity, Test2Entity, Test3View],
        subscribers: ["prepare-test/subscribers/**/*.ts"],
      });
      await TestingHelper.connection.initialize();
      await init();
    }
    return TestingHelper.connection;
  }
}

async function init() {
  const t2_1 = await Test2Entity.create({
    id: 1,
    field1: "A",
  }).save();

  await Test1Entity.create({
    id: 1,
    field1: "A",
    test2_id: t2_1.id,
    field2: 1,
  } as Test1Entity).save();

  await Test1Entity.create({
    id: 2,
    field1: "B",
    test2_id: t2_1.id,
    field2: 1,
  } as Test1Entity).save();

  await Test1Entity.create({
    id: 3,
    field1: "C",
    test2_id: t2_1.id,
    field2: 2,
  } as Test1Entity).save();

  await Test1Entity.create({
    id: 4,
    field1: "D",
    test2_id: t2_1.id,
    field2: 2,
  } as Test1Entity).save();

  await Test1Entity.create({
    id: 5,
    field1: "D",
    test2_id: t2_1.id,
    field2: 2,
  } as Test1Entity).save();

  await Test1Entity.create({
    id: 6,
    field1: "D",
    test2_id: t2_1.id,
    field2: 3,
  } as Test1Entity).save();
}
