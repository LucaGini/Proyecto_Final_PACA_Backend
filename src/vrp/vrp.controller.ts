import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Order } from '../order/order.entity.js';
import { Vrp } from './vrp.entity.js';
import cron from 'node-cron';

// --- Helpers ---
async function geocodeAddress(address: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  //const url = https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=API_KEY; Más presiso pero limitaciones pq es pago
  const res = await fetch(url, {
    headers: { 'User-Agent': 'paca-route-service' }
  });
  const data = await res.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  }
  return null;
}

function calculateDistance(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371; // km
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const h = Math.sin(dLat / 2) ** 2 +
            Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function optimizeRoute(points: any[], depot?: { lat: number; lon: number; address: string }) {
  if (points.length === 0) return [];

  const route = depot ? [depot] : [points[0]];
  const remaining = depot ? [...points] : points.slice(1);

  while (remaining.length) {
    const last = route[route.length - 1];
    let nearestIndex = 0;
    let nearestDist = Infinity;
    remaining.forEach((p, i) => {
      const dist = calculateDistance(last, p);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    });
    route.push(remaining.splice(nearestIndex, 1)[0]);
  }

  if (depot) route.push(depot); // vuelta al depósito

  return route;
}

async function generateWeeklyRoutes() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const orders = await orm.em.find(Order, {
    status: 'pending',
    orderDate: { $gte: oneWeekAgo }
  }, { populate: ['user.city.province'] });

  const locationsByProvince: Record<string, any[]> = {};
  const notGeolocated: any[] = [];

  for (const order of orders) {
    const user = order.user as any;
    const city = user?.city as any;
    const province = city?.province as any;

    const rawProvince = province?.name ?? 'Sin provincia';
    const provinceName = rawProvince.trim().toLowerCase();

    const fullAddress = [user?.street, user?.streetNumber, city?.name, rawProvince, 'Argentina']
      .filter(Boolean)
      .join(', ');

    if (!user?.street || !user?.streetNumber || !city?.name || !province?.name) {
      notGeolocated.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: 'Dirección incompleta',
        address: fullAddress,
        total: order.total,
        firstName: user?.firstName,
        lastName: user?.lastName
      });
      continue;
    }

    const coords = await geocodeAddress(fullAddress);
    if (!coords) {
      notGeolocated.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: 'No se pudo geocodificar',
        address: fullAddress,
        total: order.total,
        firstName: user?.firstName,
        lastName: user?.lastName
      });
      continue;
    }

    const location = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      firstName: user?.firstName,
      lastName: user?.lastName,
      address: fullAddress,
      ...coords
    };

    if (!locationsByProvince[provinceName]) {
      locationsByProvince[provinceName] = [];
    }
    locationsByProvince[provinceName].push(location);
  }

  const depot = {
    lat: -32.9557,
    lon: -60.6489,
    address: 'UTN FRRo, Av. Pellegrini 250, Rosario, Santa Fe'
  };

  const routesByProvince: Record<string, any[]> = {};
  for (const [provinceName, locations] of Object.entries(locationsByProvince)) {
    routesByProvince[provinceName] = optimizeRoute(locations, depot);
  }

  const result = {
    totalOrders: orders.length,
    routesByProvince,
    notGeolocated
  };

  const weekly = orm.em.create(Vrp, {
    generatedAt: new Date(),
    data: JSON.stringify(result)
  });
  await orm.em.persistAndFlush(weekly);

  return result;
}

async function getLatestWeeklyRoutes(req: Request, res: Response) {
  console.log("getLatestWeeklyRoutes llamado");
  try {
    const last = await orm.em.find(Vrp, {}, {
      orderBy: { generatedAt: 'DESC' },
      limit: 1
    });

    if (!last || last.length === 0) {
      return res.status(404).json({ message: "No hay rutas generadas aún" });
    }

    res.status(200).json(JSON.parse(last[0].data));
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo obtener la última ruta semanal', details: err.message });
  }
}

// Programar cron (martes 19:20) CAMBIAR
cron.schedule('20 19 * * 2', async () => { 
  console.log(" Ejecutando generación de rutas automáticamente...");
  try {
    await generateWeeklyRoutes();
    console.log("Rutas generadas correctamente");
  } catch (err) {
    console.error("Error al generar rutas:", err);
  }
});


export const controller = {
  getLatestWeeklyRoutes
};
