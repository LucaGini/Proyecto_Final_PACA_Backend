import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { User } from '../user/user.entity.js';
import { orm } from '../shared/db/orm.js';
import { MailService } from './mail.service.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Loaded } from '@mikro-orm/core';
import dotenv from 'dotenv';
import { GoogleAuthService } from './google-auth.service.js';


dotenv.config();

const em = orm.em;
const mailService = new MailService();
const SECRET_KEY = process.env.JWT_SECRET as string;
const googleAuthService = new GoogleAuthService();

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


const verifyCaptcha = async (token: string) => {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY || 'TU_SECRET_KEY';
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${secretKey}&response=${token}`,
  });

  const data = await response.json();
  return data.success;
};


export const loginUser = async (req: Request, res: Response) => {
  const { email, password, captchaToken } = req.body;

  try {
    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return res.status(400).json({ message: 'Captcha inválido' });
    }

    const findUser = await em.findOne(User, { email }) as Loaded<User, never>;
    if (!findUser) return res.status(401).send({ message: 'Invalid user' });
    if (!findUser.isActive) return res.status(403).json({ message: 'Usuario desactivado' });
    if (!findUser.password) return res.status(401).json({ message: 'Credenciales inválidas' });

    const isPasswordValid = await bcrypt.compare(password, findUser.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Credenciales inválidas' });

    const expiresIn = 24 * 60 * 60;
    const accessToken = jwt.sign(
      { email: findUser.email, privilege: findUser.privilege },
      SECRET_KEY,
      { expiresIn }
    );

    res.send({ accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error!');
  }
};

export const verifyGoogleToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token de Google requerido' });
    }

    // Verificar token con Google
    const googleUser = await googleAuthService.verifyGoogleToken(token);

    // Buscar usuario existente
    let user = await em.findOne(User, { email: googleUser.email });
    let isNewUser = false;

    if (user) {
      // Usuario existe - CASO LOGIN
      
      // Verificar si el usuario está activo
      if (!user.isActive) {
        return res.status(403).json({ message: 'Usuario desactivado' });
      }

      // Si no tiene googleId, agregarlo (usuario creado con email/password)
      if (!user.googleId) {
        user.googleId = googleUser.googleId;
        await em.persistAndFlush(user);
      }
    } else {
      // Usuario no existe - CASO SIGN UP
      
      isNewUser = true;

      // Verificar que el email existe
      if (!googleUser.email) {
        return res.status(400).json({ message: 'Email no proporcionado por Google' });
      }
      
      user = em.create(User, {
        googleId: googleUser.googleId,
        email: googleUser.email,
        firstName: googleUser.firstName || '',
        lastName: googleUser.lastName || '',
        privilege: 'cliente',
        isActive: true,
        password: '', 
        phone: 0, 
        city: undefined 
      });

      await em.persistAndFlush(user);
      try {
        await mailService.sendWelcomeEmail(user.email, user.firstName);
      } catch (mailError) {
        console.error('Error enviando correo de bienvenida:', mailError);
        // No fallar la operación por el email
      }
    }

    // Generar JWT token (igual para login y signup)
    const expiresIn = 24 * 60 * 60;
    const accessToken = jwt.sign(
      { email: user.email, privilege: user.privilege },
      SECRET_KEY,
      { expiresIn }
    );

    res.json({ 
      accessToken,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        privilege: user.privilege
      }
    });

  } catch (error: any) {
    console.error('Error in Google verification:', error);
    
    if (error.message === 'Invalid Google token') {
      return res.status(401).json({ message: 'Token de Google inválido' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const controller = {
  resetPassword,
  loginUser,
  verifyGoogleToken
};

