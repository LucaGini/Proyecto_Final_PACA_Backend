import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../user/user.entity.js';
import dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET as string;

export const googleCallback = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;
    
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4200'}/UserRegistration?error=auth_failed`);
    }

    // Generar JWT token
    const expiresIn = 24 * 60 * 60;
    const accessToken = jwt.sign(
      { email: user.email, privilege: user.privilege },
      SECRET_KEY,
      { expiresIn }
    );

    // Redirigir al frontend con el token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/callback?token=${accessToken}`);
  } catch (error) {
    console.error('Error in Google callback:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:4200'}/UserRegistration?error=server_error`);
  }
};

export const oauthController = {
  googleCallback
};