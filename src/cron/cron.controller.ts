import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { CronConfig } from './cron.entity.js';

async function createCron(req: Request, res: Response) {
  try {
    const { expression } = req.body;

    if (!expression) {
      return res.status(400).json({ message: 'Falta el parámetro "expression"'});
    }

    const config = orm.em.create(CronConfig, {
      expression,
      lastUpdated: new Date()
    });

    await orm.em.persistAndFlush(config);

    return res.status(201).json({
      message: 'Nueva configuración de cron creada correctamente',
      expression: config.expression,
      lastUpdated: config.lastUpdated
    });
  } catch (error: any) {
    console.error('Error creando configuración de cron:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}

async function getLatestCron(req: Request, res: Response) {
  try {
    const repo = orm.em.getRepository(CronConfig);
    const lastConfig = await repo.find({}, { orderBy: { lastUpdated: 'DESC' }, limit: 1 });

    if (!lastConfig.length) {
      return res.status(404).json({ message: 'No hay configuración de cron guardada' });
    }

    return res.status(200).json(lastConfig[0]);
  } catch (error: any) {
    console.error('Error obteniendo configuración de cron:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}

export const controller = {
  createCron,
  getLatestCron
};
