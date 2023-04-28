import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Test1Entity } from "./test1.entity";

@Entity()
export class Test2Entity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  field1: string;

  @Column({ nullable: true })
  field2: number;

  @OneToMany(() => Test1Entity, (el) => el.test2)
  test1: Test1Entity[];
}
