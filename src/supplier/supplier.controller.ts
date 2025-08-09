import express, { Request, Response } from 'express';
import { Supplier } from './supplier.entity.js';
import { orm } from '../shared/db/orm.js';
import { Product } from '../product/product.entity.js';	
import { MailService } from '../auth/mail.service.js';

const mailService = new MailService();
const em = orm.em;

async function findAll(req: Request, res: Response){
  try{
    const products = await em.find(Supplier, {});
    res.status(200).json({message:'found all products',data: products});
  } catch (error: any) {
    res.status(404).json({message: error.message});
  }
};

async function findOne(req: Request, res: Response){
  try{
  const id = req.params.id;
  const supplier = await em.findOneOrFail(Supplier, {id});
  res
    .status(200)
    .json({message: 'found one supplier', data: supplier});
  }
  catch (error: any) {
    res.status(404).json({message: error.message});
  }
};

async function add(req: Request, res: Response) {
  try {
    const supplierData = req.body;
    const existingSupplier = await em.findOne(Supplier, { cuit: supplierData.cuit });
    if (existingSupplier) {
      return res.status(303).json({ message: 'Error', error: 'The supplier already exists' });
    }

    const supplier = em.create(Supplier, supplierData);
    await em.flush();

    res.status(201).json({ message: 'Supplier created successfully', data: supplier });
  } 
  catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

  async function update(req: Request, res: Response){
    try{
      const id = req.params.id;
      const existingSupplier = await em.findOne(Supplier, { id });
      if (!existingSupplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
  
      const newCuit = req.body.Cuit;
      if (newCuit !== existingSupplier.cuit) {
        const duplicateSupplier = await em.findOne(Supplier, { cuit: newCuit });
        if (duplicateSupplier) {
          return res.status(400).json({ message: 'Error', error: 'The new Cuit is already used' });
        }
      }
      em.assign(existingSupplier, req.body);
      await em.flush();
      res
        .status(200)
        .json({message: 'supplier updated', data: existingSupplier});
    }
    catch (error: any) {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  };
  
 async function remove(req: Request, res: Response){
  try{
    const id = req.params.id;
    const supplier = await em.findOne(Supplier, { id });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    const products = await em.find(Product, { supplier });
    if (products.length > 0) {
      return res.status(400).json({ message: 'Error', error: 'The supplier has associated products.' });
    }

    await em.removeAndFlush(supplier);
    res
      .status(200)
      .json({message: 'supplier deleted', data: supplier});
  }
  catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

async function findProductsBySupplier(req: Request, res: Response){
  try{
    const cuit = Number(req.params.cuit);
    
    const supplier = await em.findOneOrFail(Supplier, {cuit: cuit});
    const products = await em.find(Product, {supplier: supplier});

    res
      .status(200)
      .json({message: 'found products by supplier', data: products});

  }catch (error: any) {
    res.status(404).json({message: error.message});
  }
};

async function findSupplierByCuit(req: Request, res: Response){
  try {
    const cuit = Number(req.params.cuit);
    const supplier = await em.findOne(Supplier, { cuit });

    if (supplier) {
      res.status(200).json({ message: 'found one supplier', data: supplier });
    } else {
      res.status(404).json({ message: 'supplier not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
async function requestRestock(req: Request, res: Response) {
  try {
    const supplierId = req.params.id;
    const { productId } = req.body;
    const supplier = await em.findOne(Supplier, { id: supplierId });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const product = await em.findOne(Product, { id: productId });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (!supplier.email) {
      return res.status(400).json({ message: 'Supplier has no email address' });
    }

    if (supplier.email) {
      await mailService.sendRestockRequestEmail(supplier.email, product.name);
      product.mailSent = true;
      await em.flush();
      res.status(200).json({ message: 'Restock request email sent', data: product
    });
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
    findProductsBySupplier,
    findSupplierByCuit,
    requestRestock
  };
