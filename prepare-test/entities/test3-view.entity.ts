import { BaseEntity, ViewColumn } from "typeorm";
import { ViewDecoratorHelper } from "../../src/functions/query-helper";
import { Test1Entity } from "./test1.entity";

@ViewDecoratorHelper<Test1Entity, Test3View>(Test1Entity, {
  field1: (el) => el.field1,
  field2: (el) => el.field2,
  test2_test1_id: (el) => el.test2.test1.id,
  test2_id: (el) => el.test2.id,
})
export class Test3View extends BaseEntity {
  @ViewColumn()
  field1: string;

  @ViewColumn()
  field2: number;

  @ViewColumn()
  test2_test1_id: number;

  @ViewColumn()
  test2_id: number;
}
