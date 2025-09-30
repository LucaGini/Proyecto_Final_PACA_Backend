import {Entity, ManyToOne, Property, Rel} from '@mikro-orm/core'; 
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { User } from '../user/user.entity.js';

interface OrderItem {
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

@Entity()
export class Order extends BaseEntity {
    @Property({ nullable: false, unique: true })
    orderNumber!: string;

    @Property({ nullable: false, default: 'pending' })
    status!: string;

    @Property({ nullable: true, onCreate: () => new Date() })
    orderDate?: Date;

    @Property({ nullable: false })
    total!: number;

    @Property({ nullable: true, onUpdate: () => new Date() })
    updatedDate?: Date;

    @Property({ nullable: false, default: '0' })
    rescheduleQuantity!: number;

    @Property({ nullable: false, unique: true })
    paymentMethod!: string;
    
    @ManyToOne(() => User, { nullable: false })
    user!: Rel<User>;

    @Property({ type: 'json' })
    orderItems: OrderItem[] = [];
}
