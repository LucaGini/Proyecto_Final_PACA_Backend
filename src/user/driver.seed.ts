import { User } from './user.entity.js';
import { orm } from '../shared/db/orm.js';

export const createDefaultDriver = async () => {
    try {
        const em = orm.em.fork();
        
        // Check if driver already exists
        const existingDriver = await em.findOne(User, { email: 'driver@driver.com' });
        
        if (!existingDriver) {
            const driverUser = em.create(User, {
                email: process.env.DRIVER_EMAIL || '',
                password: process.env.DRIVER_PASSWORD || '',
                privilege: 'transportista',
                firstName: 'Driver',
                lastName: 'Driver',
                phone: 123456789,
                isActive: true
            });

            await em.persistAndFlush(driverUser);
            console.log('Default driver user created successfully');
        } else {
            console.log('Driver user already exists');
        }
    } catch (error) {
        console.error('Error creating default driver:', error);
    }
};