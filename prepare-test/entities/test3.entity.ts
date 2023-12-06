import { BaseEntity, Column, Entity, PrimaryColumn } from "typeorm";

@Entity("entity3")
export class Test3Entity extends BaseEntity {
  @PrimaryColumn()
  id: number;

  @Column({ type: "json" })
  data: {
    date: Date;
    str: string;
    f1: {
      f2:
        | {
            f3: {
              q1: number;
            };
          }
        | {
            f3: {
              q1: number;
            };
          }[];
    };
  };
}
