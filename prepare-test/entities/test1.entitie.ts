import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Test2Entity } from "./test2.entitie";

@Entity()
export class Test1Entity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  field1: string;

  @Column({ nullable: true })
  field2: number;

  @Column({ nullable: true })
  test2_id: number;

  @ManyToOne(() => Test2Entity, (el) => el.test1)
  @JoinColumn({ name: "test2_id" })
  test2: Test2Entity;
}
