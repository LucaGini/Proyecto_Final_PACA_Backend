import {Entity, ManyToOne, Property, Rel, BeforeCreate, BeforeUpdate, OneToMany, Cascade, Collection} from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { City } from "../city/city.entity.js"
import bcrypt from 'bcrypt';
import { Order } from '../order/order.entity.js';

@Entity()   
export class User extends BaseEntity {
  

    @Property({nullable: false, unique: true})
    email!: string

    @Property({nullable: true, unique: true})
    password?: string 

    @Property({nullable: false, unique: true})
    privilege!: string
    
    @Property({nullable: false, unique: true})
    firstName!: string

    @Property({nullable: false, unique: true})
    lastName!: string

    @Property({nullable: false, unique: true})
    phone!: number

    @Property({nullable: true, unique: true})
    street?: string

    @Property({nullable: true, unique: true})
    streetNumber?: string

    @ManyToOne(() => City, {nullable: true})
    city?: Rel<City>

    @Property({ nullable: true, unique: true })
    googleId?: string;

    @Property({nullable: true, unique: true})
    resetPasswordToken?: string

    @Property({nullable: true, unique: true})
    resetPasswordExpires?: Date

    @Property({ nullable: false })
    isActive: boolean = true;

    @OneToMany(() => Order, (order) => order.user, {cascade:[Cascade.ALL]})
    orders = new Collection<Order>(this);

    // vi un par de videos q usan isDirty, pero no me lo reconoce 
    // así q tuve q poner un poco más de lógica en el controller en las funcione
    // q tocan de alguna manera la contra (signup, update, updatepassword)
    @BeforeCreate()
    @BeforeUpdate()
    async hashPassword() {
        if (this.password && !this.password.startsWith('$2b$')) {
          const salt = await bcrypt.genSalt(10);
          this.password = await bcrypt.hash(this.password, salt);
        }
    }
}
