import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Order } from '../order/order.entity.js';
import { Vrp } from './vrp.entity.js';
import cron from 'node-cron';


const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY || ""; 



async function geocodeAddress(address: string) {
  // 1. Intentar con OpenCage
  if (OPENCAGE_API_KEY) {
    try {
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${OPENCAGE_API_KEY}&language=es&countrycode=ar&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const g = data.results[0].geometry;
        return { lat: g.lat, lon: g.lng };
      }
    } catch (err) {
      console.error("Error con OpenCage:", err);
    }
  }


  //  Fallback a Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'paca-route-service' } });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error("Error con Nominatim:", err);
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


// ---------- GENETIC ALGORITHM ----------
function geneticOptimize(points: any[], depot: any, generations = 200, populationSize = 50) {
  if (points.length === 0) return [depot, depot];


  let population = Array.from({ length: populationSize }, () => shuffle([...points]));


  function fitness(route: any[]) {
    let dist = 0;
    let prev = depot;
    for (const p of route) {
      dist += calculateDistance(prev, p);
      prev = p;
    }
    dist += calculateDistance(prev, depot);
    return 1 / dist;
  }


  for (let gen = 0; gen < generations; gen++) {
    const scored = population.map(route => ({ route, score: fitness(route) }));
    scored.sort((a, b) => b.score - a.score);


    const newPop = scored.slice(0, populationSize / 5).map(s => s.route);


    while (newPop.length < populationSize) {
      const [p1, p2] = [
        scored[Math.floor(Math.random() * scored.length)].route,
        scored[Math.floor(Math.random() * scored.length)].route
      ];
      const child = crossover(p1, p2);
      if (Math.random() < 0.2) mutate(child);
      newPop.push(child);
    }


    population = newPop;
  }


  const best = population.sort((a, b) => fitness(b) - fitness(a))[0];
  return [depot, ...best, depot];
}


function crossover(a: any[], b: any[]) {
  const start = Math.floor(Math.random() * a.length);
  const end = start + Math.floor(Math.random() * (a.length - start));
  const child = a.slice(start, end);
  for (const x of b) {
    if (!child.includes(x)) child.push(x);
  }
  return child;
}


function mutate(route: any[]) {
  const i = Math.floor(Math.random() * route.length);
  const j = Math.floor(Math.random() * route.length);
  [route[i], route[j]] = [route[j], route[i]];
}


function shuffle(arr: any[]) {
  return arr.sort(() => Math.random() - 0.5);
}


// ----
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
    routesByProvince[provinceName] = geneticOptimize(locations, depot);
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


// ---------- CRON ----------
// cron.schedule('59 23 * * 0', async () => {
//   console.log(" Ejecutando generación de rutas automáticamente...");
//   try {
//     await generateWeeklyRoutes();
//     console.log("Rutas generadas correctamente");
//   } catch (err) {
//     console.error("Error al generar rutas:", err);
//   }
// });


export const controller = {
  getLatestWeeklyRoutes
};
