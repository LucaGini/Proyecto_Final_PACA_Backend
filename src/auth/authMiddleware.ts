import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET as string;

interface AuthenticatedRequest extends Request {
  user?: any;
}

// LOGUEADOS O ADMINISTRADORO O CLIENTE O TRANSPORTISTA
function authenticateRole(role: 'administrador' | 'cliente' | 'transportista') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No se ha proporcionado un token' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded: any = jwt.verify(token, SECRET_KEY);
      if (!decoded || decoded.privilege !== role) {
        return res.status(403).json({ message: `Requiere acceso de: ${role}` });
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
export const authenticateDriver = authenticateRole('transportista');


//TODOS MENOS ADMINISTRADORES
export function blockRoleIfLogged(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, SECRET_KEY);
    if (decoded.privilege === 'administrador' || decoded.privilege === 'transportista') {
      return res.status(403).json({ message: 'Acceso denegado para administradores' });
    }
    req.user = decoded;
    return next();
  } catch (error) {
    return next();
  }
}

// SOLO NO LOGUEADOS
export function onlyAnonymous(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader) return next();
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, SECRET_KEY);
    return res.status(403).json({ message: 'Esta ruta es solo para usuarios no logueados' });
  } catch (error) {
    return next();
  }
}