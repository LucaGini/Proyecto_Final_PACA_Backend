import express, { Request, Response, NextFunction } from 'express';
import { Category } from './category.entity.js';
import { orm } from '../shared/db/orm.js';
import { Product } from '../product/product.entity.js';

const em = orm.em;

async function findAll(req: Request, res: Response){
  try{
    const categories = await em.find(Category, {});
    res.status(200).json({message:'found all categories',data: categories});
  } catch (error: any) {
    res.status(404).json({message: error.message});
  }
};

async function findOne(req: Request, res: Response){
  try{
  const id = req.params.id;
  const category = await em.findOneOrFail(Category, {id});
  res
    .status(200)
    .json({message: 'found one category', data: category});
  }
  catch (error: any) {
    res.status(404).json({message: error.message}); //404 == no está
  }
};

async function add(req: Request, res: Response) {
  try {
    const categoryData = req.body;
    const existingCategory = await em.findOne(Category, { name: categoryData.name });
    if (existingCategory) {
      return res.status(303).json({ message: 'Error', error: 'The category already exists' }); 
    }

    const pcategory = em.create(Category, categoryData);
    await em.flush();

    res.status(201).json({ message: 'Category created successfully', data: pcategory });
  } 
  catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};
  
async function update(req: Request, res: Response){
  try{
    const id = req.params.id;
    const existingCategory = await em.findOne(Category, { id });
      if (!existingCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }
  
      const newName = req.body.name;
      if (newName !== existingCategory.name) {
        const duplicateCategory = await em.findOne(Category, { name: newName });
        if (duplicateCategory) {
          return res.status(400).json({ message: 'Error', error: 'The new name is already used' });
        }
      }
    em.assign(existingCategory, req.body);
    await em.flush();
    res
      .status(200)
      .json({message: 'category updated', data: existingCategory});
    }
  catch (error: any) {
    res.status(404).json({message: error.message});
    }
};
  
 async function remove(req: Request, res: Response){
  try{
    const id = req.params.id;
    const category = await em.findOne(Category, { id });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    const cities = await em.find(Product, { category });
    if (cities.length > 0) {
      return res.status(400).json({ message: 'Error', error: 'The category has associated products.' });
    }
    await em.removeAndFlush(category);
    res
      .status(200)
      .json({message: 'category deleted', data: category});
  }
  catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

async function findProductsByCategory(req: Request, res: Response){
  try{
    const name = req.params.name;
    const category = await em.findOneOrFail(Category, {name: name});
    const products = await em.find(Product, {category: category});
    res
      .status(200)
      .json({message: 'found products by category', data: products});

  }catch (error: any) {
    res.status(404).json({message: error.message});
  }
};

async function findCategoryByName(req: Request, res: Response) {
  try {
    const name = req.params.name;
    const category = await em.findOne(Category, { name });

    if (category) {
      res.status(200).json({ message: 'found one category', data: category });
    } else {
      res.status(404).json({ message: 'category not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
  
  export const controller = {  
    findAll, 
    findOne,
    add,
    update,
    remove,
    findProductsByCategory,
    findCategoryByName
  };
