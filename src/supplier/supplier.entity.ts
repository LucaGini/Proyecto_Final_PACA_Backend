import {Entity, ManyToOne, OneToMany, Property, Collection, Cascade} from '@mikro-orm/core'; 
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Product } from "../product/product.entity.js";

@Entity()   
export class Supplier extends BaseEntity {
    @Property({nullable: false, unique: true})
    cuit!: number

    @Property({nullable: false, unique: true})
    businessName!: string

    @Property({nullable: false, unique: true})
    email!: string

    @Property({nullable: false, unique: true})
    phone!: string

    @OneToMany(() => Product, (product) => product.supplier, {cascade:[Cascade.ALL]})
    products = new Collection<Product>(this);

}