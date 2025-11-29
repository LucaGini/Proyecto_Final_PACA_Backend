import {Cascade, Entity, OneToMany, Property, Collection} from '@mikro-orm/core'
import { City } from '../city/city.entity.js';
import { BaseEntity } from '../shared/db/baseEntity.entity.js'; 
import { User } from '../user/user.entity.js';

@Entity()
export class Province extends BaseEntity{
    @Property({nullable: false, unique: true})
    name!: string
    
    @OneToMany(() => City, (city) => city.province, {cascade:[Cascade.ALL]})
    cities = new Collection<City>(this);

    @OneToMany(() => User, (user) => user.province, {cascade:[Cascade.ALL]})
    user = new Collection<City>(this);
}