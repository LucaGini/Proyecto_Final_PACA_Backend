import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET as string;

interface AuthenticatedRequest extends Request {
  user?: any;
}

function authenticateRole(role: 'administrador' | 'cliente') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No se ha proporcionado un token' });

    const token = authHeader.split(' ')[1];

    try {
      const decoded: any = jwt.verify(token, SECRET_KEY);
      if (!decoded || decoded.privilege !== role) {
        return res.status(403).json({ message: `Requiere acceso de ${role}` });
      }
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Token inválido' });
    }
  };
}

export const authenticateAdmin = authenticateRole('administrador');
export const authenticateClient = authenticateRole('cliente');