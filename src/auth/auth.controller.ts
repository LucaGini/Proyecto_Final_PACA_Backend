import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { User } from '../user/user.entity.js';
import { orm } from '../shared/db/orm.js';
import { MailService } from './mail.service.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Loaded } from '@mikro-orm/core';
import dotenv from 'dotenv';

dotenv.config();

const em = orm.em;
const mailService = new MailService();
const SECRET_KEY = process.env.JWT_SECRET as string;

export const resetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await em.findOne(User, { email });
    if (!user) {
       return res.status(404).send('User not found');
       }

    const token = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hora en el futuro

    await em.persistAndFlush(user);

    // Enviar el correo electrónico
    await mailService.sendPasswordResetEmail(email, token);

    res.status(202).send('Password reset email sent');
    
  } catch (error: any) {
    console.error('Error in reset password', error);
    res.status(500).send('Internal server error');
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const userData = {
      email: req.body.email,
      password: req.body.password
  }

  try {
    const findUser = await em.findOne(User, { email: userData.email }) as Loaded<User, never>;
    if (!findUser) return res.status(401).send({message: 'Invalid user'});
    const isPasswordValid = await bcrypt.compare(userData.password, findUser.password)

    if (!isPasswordValid) return res.status(401).json({message: 'Credenciales inválidas'});
    
    const expiresIn = 24*60*60;
    const accessToken = jwt.sign({ email: findUser.email, privilege: findUser.privilege }, SECRET_KEY, {expiresIn: expiresIn});
    res.send({ accessToken });
  } catch (err) {
    return res.status(500).send('Server error!');
  }
}

export const controller = {
  resetPassword,
  loginUser,
  
};

