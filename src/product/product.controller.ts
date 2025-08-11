import express, { Request, Response, NextFunction } from 'express';
import { Product } from './product.entity.js';
import { orm } from '../shared/db/orm.js';
import { deleteFromCloudinary, extractPublicIdFromUrl } from '../shared/db/image_processor/cloudinary_middleware.js';

const em = orm.em;


export async function findAllActive(req: Request, res: Response) {
  try {
    const products = await em.find(Product, { isActive: true });
    return res.status(200).json({ data: products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error getting active products', error });
  }
}
export async function findAll(req: Request, res: Response) {
  try {
    const products = await em.find(Product, {}); 
    return res.status(200).json({ data: products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error getting products', error });
  }
}

async function findOne(req: Request, res: Response){
  try{
  const id = req.params.id;
  const product = await em.findOneOrFail(Product, {id});//
  res
    .status(200)
    .json({message: 'found one product', data: product});
  }
  catch (error: any) {
    res.status(404).json({message: error.message});
  }
};

async function add(req: Request, res: Response) {
  try {
    const { name, description, price, stock, minimumStock, category, supplier } = req.body;
    let imageUrl = '';

    // Cloudinary automáticamente sube la imagen y nos da la URL
    if (req.file) {
      imageUrl = (req.file as any).path; // Cloudinary storage guarda la URL completa en 'path'
    }

    const existingProduct = await em.findOne(Product, { name });

    if (existingProduct) {
      return res.status(303).json({ message: 'Error', error: 'El producto already exists' });
    }

    const product = em.create(Product, {
      name,
      description,
      price: parseFloat(price),
      stock: parseInt(stock),
      minimumStock: parseInt(minimumStock),
      mailSent: false,
      image: imageUrl,
      isActive: true,
      category,
      supplier
    });

    await em.persistAndFlush(product);

    res.status(201).json({ message: 'Producto creado con éxito', data: product });
  } catch (error: any) {
    console.error('Error al crear el producto:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
}
  async function update(req: Request, res: Response){
    try{
      const id = req.params.id;
      const existingProduct = await em.findOne(Product, { id });
      if (!existingProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }
  
      const newName = req.body.name;
      if (newName !== existingProduct.name) {
        const duplicateProduct = await em.findOne(Product, { name: newName });
        if (duplicateProduct) {
          return res.status(400).json({ message: 'Error', error: 'The new name is already used' });
        }
      }

      // Si se sube una nueva imagen, actualizar la URL
      if (req.file) {
        // Eliminar la imagen anterior de Cloudinary si existe
        if (existingProduct.image) {
          const publicId = extractPublicIdFromUrl(existingProduct.image);
          if (publicId) {
            await deleteFromCloudinary(publicId);
          }
        }
        // Asignar la nueva URL de imagen
        req.body.image = (req.file as any).path;
      }

      const newStock = Number(req.body.stock);
      const minimumStock = Number(req.body.minimumStock);
      if (!isNaN(newStock)) { 
        if (newStock >= minimumStock) {
          req.body.mailSent = false;
        }
      }

      if (req.body.isActive === false) {
        return res.status(409).json({ message: 'Product cannot be updated because it is inactive' });
      }

      em.assign(existingProduct, req.body);
      await em.flush();      
      res
        .status(200)
        .json({message: 'product updated', data: existingProduct});
    }
    catch (error: any) {
      res.status(404).json({message: error.message});
    }
  };
  
 async function softDeleteProduct(req: Request, res: Response){
  try{
    const id = req.params.id;
    const product = await em.findOne(Product, { id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    // if (product.image) {
    //   const publicId = extractPublicIdFromUrl(product.image);
    //   if (publicId) {
    //     await deleteFromCloudinary(publicId);
    //   }
    // }

    product.isActive = false;
    await em.persistAndFlush(product);
    res
      .status(200)
      .json({message: 'product deleted', data: product});
  }
  catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

async function findProductByName(req: Request, res: Response) {
  try {
    const name = req.params.name;
    const product = await em.findOne(Product, { name });

    if (product) {
      res.status(404).json({ message: 'found one product', data: product });
    } else {
      res.status(200).json({ message: 'product not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

async function search(req: Request, res: Response) {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    const searchQuery = String(query).toLowerCase();
    const products = await em.find(Product, { isActive: true }, { populate: ['category'] });

    const filteredProducts = products.filter(product => 
      product.name.toLowerCase().includes(searchQuery) || 
      product.category.name.toLowerCase().includes(searchQuery)
    );

    res.status(200).json({ 
      message: 'found products', 
      data: filteredProducts 
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

async function verifyStock(req: Request, res: Response) {
  try {
    const { id: productId } = req.params; 
    const { quantity } = req.query;

    const product = await em.findOne(Product, { id: productId });

    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if (Number(quantity) > product.stock) { // lo tuve que poner así al quantity pq si no no me dejaba aunque si lo paso como numero
      return res.status(400).json({
        message: 'Stock insuficiente para el articulo',
        productName: product.name,
        availableStock: product.stock,
      });
    }

    if(product.isActive === false){
      return res.status(409).json({ message: 'Product is inactive, cannot verify stock' });
    }

    res.status(200).json({
      message: 'Stock suficiente',
      availableStock: product.stock,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
async function reactivateProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const product = await em.findOne(Product, { id });
    console.log("el producto es: ", product); 
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.isActive) {
      return res.status(409).json({ message: 'Product is already active' });
    }
    console.log("el producto esta activo?", product.isActive);

    product.isActive = true;
    await em.flush();
    console.log("el producto esta activo?", product.isActive);
    return res.status(200).json({ message: 'Product reactivated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error', error });
  }
}

export const controller = {  
  findAllActive,
  findAll, 
  findOne,
  add,
  update,
  softDeleteProduct,
  findProductByName,
  search,
  verifyStock,
  reactivateProduct
};
