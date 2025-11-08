import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

@Entity()
export class CronConfig extends BaseEntity {
  @Property()
  expression!: string;

  @Property({ nullable: true })
  lastUpdated?: Date;
}
