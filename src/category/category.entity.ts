import {Entity, OneToMany, Property, Collection, Cascade} from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Product } from "../product/product.entity.js";

@Entity()   
export class Category extends BaseEntity {
    
    @Property({nullable: false, unique: true})
    name!: string 

    @Property({nullable: false, unique: true})
    description!: string

    @OneToMany(() => Product, (product) => product.category, {cascade:[Cascade.ALL]})
    products = new Collection<Product>(this);
}