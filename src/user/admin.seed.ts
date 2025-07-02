import { User } from './user.entity.js';
import { orm } from '../shared/db/orm.js';

export const createDefaultAdmin = async () => {
    try {
        const em = orm.em.fork();
        
        // Check if admin already exists
        const existingAdmin = await em.findOne(User, { email: 'admin@admin.com' });
        
        if (!existingAdmin) {
            

            const adminUser = em.create(User, {
                email: process.env.ADMIN_EMAIL || '',
                password: process.env.ADMIN_PASSWORD || '', // This will be hashed automatically by the entity hooks
                privilege: 'administrador',
                firstName: 'Admin',
                lastName: 'Admin',
                phone: 123456789
            });

            await em.persistAndFlush(adminUser);
            console.log('Default admin user created successfully');
        } else {
            console.log('Admin user already exists');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
};