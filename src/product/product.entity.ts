import {Entity, ManyToOne, Property, Rel} from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Category } from "../category/category.entity.js";
import { Supplier } from "../supplier/supplier.entity.js";

@Entity()   
export class Product extends BaseEntity { 

    @Property({nullable: false, unique: true})
    name!: string

    @Property({nullable: false, unique: true})
    description!: string 

    @Property({nullable: false, unique: true})
    price!: number

    @Property({nullable: false, unique: true})
    stock!: number

    @Property({nullable: false, unique: true})
    minimumStock!: number

    @Property({nullable: false, unique: true})
    image!: string

    @Property({nullable: false, unique: true})
    mailSent!: boolean

    @ManyToOne(() => Category, {nullable: false})
    category!: Rel<Category>

    @ManyToOne(() => Supplier, {nullable: false})
    supplier!: Rel<Supplier>
}