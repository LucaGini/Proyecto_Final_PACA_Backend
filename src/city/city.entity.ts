import {Entity, ManyToOne, OneToMany, Property, Rel, Collection, Cascade} from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Province } from "../province/province.entity.js";
import { User } from "../user/user.entity.js"

@Entity()   
export class City extends BaseEntity {
    @Property({nullable: false, unique: true, type: 'string'})
    postCode!: string 

    @Property({nullable: false, unique: true})
    name!: string

    @Property({nullable: false, unique: false})
    surcharge?: number

    @ManyToOne(() => Province, {nullable: false})
    province!: Rel<Province>

    @OneToMany(() => User, (user) => user.city, {cascade:[Cascade.ALL]})
    users = new Collection<User>(this);
}