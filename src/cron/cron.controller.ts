import { Request, Response } from 'express';
import cron, { ScheduledTask } from 'node-cron';
import { orm } from '../shared/db/orm.js';
import { CronConfig } from './cron.entity.js';
import { generateWeeklyRoutes } from '../vrp/vrp.controller.js'; // 👈 tu función VRP

let currentCronJob: ScheduledTask | null = null;

export async function createCron(req: Request, res: Response) {
  try {
    const { expression } = req.body;
    if (!expression || !cron.validate(expression)) {
      return res.status(400).json({ error: 'Expresión CRON inválida o faltante' });
    }

    if (currentCronJob) {
      currentCronJob.stop();
      currentCronJob = null;
    }
    currentCronJob = cron.schedule(expression, async () => {
      //console.log(`Ejecutando job automático (${expression})...`);
      try {
        await generateWeeklyRoutes();
      } catch (err) {
        console.error('Error ejecutando generateWeeklyRoutes:', err);
      }
    });

    const em = orm.em.fork(); // 👈 importante
    const [existing] = await em.find(CronConfig, {}, { limit: 1 });
    if (existing) {
      existing.expression = expression;
      existing.lastUpdated = new Date();
    } else {
      const newCron = em.create(CronConfig, { expression, lastUpdated: new Date() });
      em.persist(newCron);
    }
    await em.flush();

    res.status(201).json({ message: 'Cron creado correctamente', expression });
  } catch (error) {
    console.error(' Error al crear cron:', error);
    res.status(500).json({ error: 'Error al crear cron dinámico' });
  }
}

export async function getLatestCron(req: Request, res: Response) {
  try {
    const [config] = await orm.em.find(CronConfig, {}, { limit: 1 });
    if (!config) {
      return res.status(404).json({ message: 'No hay cron configurado actualmente' });
    }

    res.status(200).json({
      expression: config.expression,
      lastUpdated: config.lastUpdated
    });
  } catch (error) {
    console.error('Error al obtener cron:', error);
    res.status(500).json({ error: 'Error al obtener cron actual' });
  }
}

export const controller = {
  createCron,
  getLatestCron,
};
