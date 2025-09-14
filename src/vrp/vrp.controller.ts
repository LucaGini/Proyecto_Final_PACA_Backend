import { Request, Response } from 'express';
import { orm } from '../shared/db/orm.js';
import { Order } from '../order/order.entity.js';
import { Vrp } from './vrp.entity.js';
import cron from 'node-cron';
import { MailService } from '../auth/mail.service.js';

const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY || ""; 
const mailService = new MailService();

// --- Helpers ---
async function geocodeAddress(address: string) {
  try {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${OPENCAGE_API_KEY}&language=es&countrycode=ar&limit=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      return null; // nada encontrado
    }

    const result = data.results[0];

    // Validaciones para evitar falsos positivos
    const confidence = result.confidence ?? 0;
    const components = result.components || {};

    if (
      confidence < 6 || // escala 1-10 (descartamos bajas confianzas)
      !components.road || // no tiene calle
      (!components.house_number && address.includes(" ")) // no tiene número
    ) {
      return null;
    }

    return {
      lat: result.geometry.lat,
      lon: result.geometry.lng
    };
  } catch (err) {
    console.error("Error geocodificando dirección:", err);
    return null;
  }
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

function buildGoogleMapsLink(route: any[]) {
  if (route.length < 2) return null;
  const uniqueRoute = route.filter((point, i, arr) => {
    if (i === 0) return true;
    return point.address !== arr[i - 1].address;
  });
  const addresses = uniqueRoute.map(p => encodeURIComponent(p.address));
  return `https://www.google.com/maps/dir/${addresses.join("/")}`;
}


// ----
async function generateWeeklyRoutes() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const orders = await orm.em.find(Order, {
    $or: [
      { status: 'pending', orderDate: { $gte: oneWeekAgo } },
      { status: 'rescheduled' }
    ]
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
        lastName: user?.lastName,
      });
      order.status = 'rescheduled';
      order.rescheduleQuantity = (order.rescheduleQuantity || 0) + 1;
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
        lastName: user?.lastName,  
      });

      order.status = 'rescheduled';
      order.rescheduleQuantity = (order.rescheduleQuantity || 0) + 1;

      if (user?.email) {
        await mailService.sendAddressNotFoundEmail(
          user.email,
          user.firstName,
          order.orderNumber,
          order.rescheduleQuantity
        );
      }
      continue;
    }
    
    order.status = 'in distribution';

    const location = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      firstName: user?.firstName,
      lastName: user?.lastName,
      address: fullAddress,
      status: order.status,
      ...coords
    };

    if (!locationsByProvince[provinceName]) {
      locationsByProvince[provinceName] = [];
    }
    locationsByProvince[provinceName].push(location);
  }

  await orm.em.persistAndFlush(orders);

  const depot = {
    lat: -32.9557,
    lon: -60.6489,
    address: 'UTN FRRo, Zeballos 1341, Rosario, Santa Fe'
  };

  const routesByProvince: Record<string, any> = {};
  for (const [provinceName, locations] of Object.entries(locationsByProvince)) {
    const route = geneticOptimize(locations, depot);
    const mapsLink = buildGoogleMapsLink(route);

    routesByProvince[provinceName] = {
      route,
      mapsLink
    };
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

  // Enviar mail con los links
  for (const [province, data] of Object.entries(routesByProvince)) {
    await mailService.sendRoutesEmail(province, data.mapsLink);
  }
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
cron.schedule('20 23 * * 6', async () => {
  console.log(" Ejecutando generación de rutas automáticamente...");
  try {
    await generateWeeklyRoutes();
    console.log("Rutas generadas correctamente y mail enviado");
  } catch (err) {
    console.error("Error al generar rutas:", err);
  }
});

export const controller = {
  getLatestWeeklyRoutes
};
