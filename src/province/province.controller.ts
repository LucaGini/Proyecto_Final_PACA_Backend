import express, { Request, Response, NextFunction } from 'express';
import { Province } from './province.entity.js';
import { orm } from '../shared/db/orm.js';
import { City } from '../city/city.entity.js';

const em = orm.em;

async function findAll(req: Request, res: Response){
  try{
    const provinces = await em.find(Province, {});
    res.status(200).json({message:'found all provinces',data: provinces});
  } catch (error: any) {
    res.status(500).json({message: error.message});
  }
};

async function findOne(req: Request, res: Response){
  try{
  const id = req.params.id;
  const province = await em.findOneOrFail(Province, {id});
  res
    .status(200)
    .json({message: 'found one Province', data: province});
  }
  catch (error: any) {
    res.status(404).json({message: error.message});
  }
};

async function add(req: Request, res: Response) {
  try {
    const provinceData = req.body;
    const existingProvince = await em.findOne(Province, { name: provinceData.name });
    if (existingProvince) {
      return res.status(303).json({ message: 'Error', error: 'The province already exists' });
    }

    const province = em.create(Province, provinceData);
    await em.flush();

    res.status(201).json({ message: 'Province created successfully', data: province });
  } 
  catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

  async function update(req: Request, res: Response){ 
    try{
      const id = req.params.id;
      const existingProvince = await em.findOne(Province, { id });
      if (!existingProvince) {
        return res.status(404).json({ message: 'Province not found' });
      }
  
      const newName = req.body.name;
      if (newName !== existingProvince.name) {
        const duplicateProvince = await em.findOne(Province, { name: newName });
        if (duplicateProvince) {
          return res.status(303).json({ message: 'Error', error: 'The new name is already used' });
        }
      }
      em.assign(existingProvince, req.body);
      await em.flush();
      res
        .status(200)
        .json({message: 'Province updated', data: existingProvince});
    }
    catch (error: any) {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  };

 async function remove(req: Request, res: Response){
  try{
    const id = req.params.id;
    const province = await em.findOne(Province, { id });
    if (!province) {
      return res.status(404).json({ message: 'Province not found' });
    }
    const cities = await em.find(City, { province });
    if (cities.length > 0) {
      return res.status(400).json({ message: 'Error', error: 'The province has associated cities.' });
    }

    await em.removeAndFlush(province);
    res
      .status(200)
      .json({message: 'Province deleted', data: province});
  }
  catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};  


async function findProvinceByName(req: Request, res: Response) {
  try {
    const name = req.params.name;
    const province = await em.findOne(Province, { name });

    if (province) {
      res.status(404).json({ message: 'found one province', data: province });
    } else {
      res.status(200).json({ message: 'province not found', data: province });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

async function findCitiesByProvince(req: Request, res: Response){
  try {
    const id = req.params.id;
    const province = await em.findOneOrFail(Province, {id: id});
    const cities = await em.find(City, {province: province});
    res.status(200).json({message: 'found cities by province', data: cities});
  } catch (error: any) {
    res.status(404).json({message: error.message});
  }
}

export const controller = { 
  findAll, 
  findOne,
  add,
  update,
  remove,
  findProvinceByName,
  findCitiesByProvince
};