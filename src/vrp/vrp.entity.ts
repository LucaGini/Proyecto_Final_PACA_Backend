import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';

@Entity()
export class Vrp extends BaseEntity {
  @Property()
  generatedAt!: Date;

  @Property({ type: 'text' }) // guarda JSON como string
  data!: string;
}