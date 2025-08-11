// import { Request, Response } from "express";
// import { orm } from "../../shared/db/orm.js";
// import { Product } from "../product.entity.js";
// import { controller } from "../product.controller.js";

// // Mock orm
// jest.mock('../../shared/db/orm.js', () => ({
//   orm: {
//     em: {
//       find: jest.fn(),
//       findOne: jest.fn(),
//       findOneOrFail: jest.fn(),
//       create: jest.fn(),
//       flush: jest.fn(),
//       assign: jest.fn(),
//       persistAndFlush: jest.fn(),
//       removeAndFlush: jest.fn()
//     }
//   }
// }));

// describe('Product Controller', () => {
//   let mockRequest: Partial<Request>;
//   let mockResponse: Partial<Response>;

//   beforeEach(() => {
//     mockRequest = {};
//     mockResponse = {
//       json: jest.fn(),
//       status: jest.fn().mockReturnThis(),
//     };
//   });

//   describe('findAll', () => {
//     it('should return all products successfully', async () => {
//       const mockProducts = [
//         { id: '1', name: 'Product 1', price: 100, stock: 10 },
//         { id: '2', name: 'Product 2', price: 200, stock: 20 }
//       ];

//       (orm.em.find as jest.Mock).mockResolvedValue(mockProducts);

//       await controller.findAll(mockRequest as Request, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(200);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'found all products',
//         data: mockProducts
//       });
//     });

//     it('should return 404 when there is an error', async () => {
//       const errorMessage = 'Database error';
//       (orm.em.find as jest.Mock).mockRejectedValue(new Error(errorMessage));

//       await controller.findAll(mockRequest as Request, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(404);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: errorMessage
//       });
//     });
//   });

// describe('findOne', () => {
//     beforeEach(() => {
//       (orm.em.findOneOrFail as jest.Mock) = jest.fn();
//     });

//     it('should find one product successfully', async () => {
//       const mockRequest = {
//         params: { id: '1' }
//       } as unknown as Request;

//       const foundProduct = { 
//         id: '1', 
//         name: 'Test Product',
//         price: 100,
//         stock: 10
//       };

//       (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(foundProduct);

//       await controller.findOne(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(200);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'found one product',
//         data: foundProduct
//       });
//     });

//     it('should return 404 when product not found', async () => {
//       const mockRequest = {
//         params: { id: '999' }
//       } as unknown as Request;

//       (orm.em.findOneOrFail as jest.Mock).mockRejectedValue(new Error('Product not found'));

//       await controller.findOne(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(404);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Product not found'
//       });
//     });
// });

// describe('add', () => {
//     let consoleErrorSpy: jest.SpyInstance;

//     beforeEach(() => {
//       (orm.em.findOne as jest.Mock) = jest.fn();
//       (orm.em.create as jest.Mock) = jest.fn();
//       (orm.em.persistAndFlush as jest.Mock) = jest.fn();

//       consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
//     });

//     afterEach(() => {
//       consoleErrorSpy.mockRestore();
//     });

//     it('should create a new product successfully', async () => {
//       const mockRequest = {
//         body: { 
//           name: 'New Product',
//           description: 'Test Description',
//           price: '100.50',
//           stock: '10',
//           category: { id: '1' },
//           supplier: { id: '1' }
//         },
//         file: {
//           filename: 'test-image.jpg'
//         }
//       } as unknown as Request;

//       const newProduct = {
//         id: '1',
//         name: 'New Product',
//         description: 'Test Description',
//         price: 100.50,
//         stock: 10,
//         image: 'uploads/test-image.jpg',
//         category: { id: '1' },
//         supplier: { id: '1' }
//       };

//       (orm.em.findOne as jest.Mock).mockResolvedValue(null);
//       (orm.em.create as jest.Mock).mockReturnValue(newProduct);
//       (orm.em.persistAndFlush as jest.Mock).mockResolvedValue(undefined);

//       await controller.add(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(201);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Producto creado con éxito',
//         data: newProduct
//       });
//     });

//     it('should return 303 when product already exists', async () => {
//       const mockRequest = {
//         body: { 
//           name: 'Existing Product'
//         }
//       } as unknown as Request;

//       const existingProduct = {
//         id: '1',
//         name: 'Existing Product'
//       };

//       (orm.em.findOne as jest.Mock).mockResolvedValue(existingProduct);

//       await controller.add(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(303);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Error',
//         error: 'El producto already exists'
//       });
//     });

//     it('should return 500 on server error', async () => {
//       const mockRequest = {
//         body: { 
//           name: 'New Product'
//         }
//       } as unknown as Request;

//       const errorMessage = 'Database error';
//       (orm.em.findOne as jest.Mock).mockRejectedValue(new Error(errorMessage));

//       await controller.add(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(500);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Error interno del servidor',
//         error: errorMessage
//       });
//     });
// });

// describe('update', () => {
//     beforeEach(() => {
//       (orm.em.findOne as jest.Mock) = jest.fn();
//       (orm.em.assign as jest.Mock) = jest.fn();
//       (orm.em.flush as jest.Mock) = jest.fn();
//     });

//     it('should update product successfully', async () => {
//       const updatedProduct = {
//         id: '1',
//         name: 'Updated Product',
//         price: 150,
//         stock: 20
//       };

//       const mockRequest = {
//         params: { id: '1' },
//         body: { 
//           name: 'Updated Product',
//           price: 150,
//           stock: 20
//         }
//       } as unknown as Request;

//       // Mock findOne for both initial find and duplicate check
//       (orm.em.findOne as jest.Mock)
//         .mockResolvedValueOnce(updatedProduct)  // First call
//         .mockResolvedValueOnce(null);           // Duplicate check

//       (orm.em.assign as jest.Mock).mockReturnValue(updatedProduct);
//       (orm.em.flush as jest.Mock).mockResolvedValue(undefined);

//       await controller.update(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(200);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'product updated',
//         data: updatedProduct
//       });
//     });
//   });


// describe('remove', () => {
//     beforeEach(() => {
//       (orm.em.findOne as jest.Mock) = jest.fn();
//       (orm.em.removeAndFlush as jest.Mock) = jest.fn();
//     });

//     it('should delete product successfully', async () => {
//       const mockRequest = {
//         params: { id: '1' }
//       } as unknown as Request;

//       const productToDelete = { 
//         id: '1', 
//         name: 'Product To Delete',
//         price: 100,
//         stock: 10
//       };

//       (orm.em.findOne as jest.Mock).mockResolvedValue(productToDelete);
//       (orm.em.removeAndFlush as jest.Mock).mockResolvedValue(undefined);

//       await controller.remove(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(200);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'product deleted',
//         data: productToDelete
//       });
//     });

//     it('should return 404 when product not found', async () => {
//       const mockRequest = {
//         params: { id: '999' }
//       } as unknown as Request;

//       (orm.em.findOne as jest.Mock).mockResolvedValue(null);

//       await controller.remove(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(404);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Province not found'
//       });
//     });

//     it('should return 500 on server error', async () => {
//       const mockRequest = {
//         params: { id: '1' }
//       } as unknown as Request;

//       const errorMessage = 'Database error';
//       (orm.em.findOne as jest.Mock).mockRejectedValue(new Error(errorMessage));

//       await controller.remove(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(500);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Internal server error',
//         error: errorMessage
//       });
//     });
// });

// describe('findProductByName', () => {
//     beforeEach(() => {
//       (orm.em.findOne as jest.Mock) = jest.fn();
//     });

//     it('should find product by name successfully', async () => {
//       const mockRequest = {
//         params: { name: 'Test Product' }
//       } as unknown as Request;

//       const foundProduct = { 
//         id: '1', 
//         name: 'Test Product',
//         price: 100,
//         stock: 10
//       };

//       (orm.em.findOne as jest.Mock).mockResolvedValue(foundProduct);

//       await controller.findProductByName(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(200);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'found one product',
//         data: foundProduct
//       });
//     });

//     it('should return 404 when product not found', async () => {
//       const mockRequest = {
//         params: { name: 'Non Existent Product' }
//       } as unknown as Request;

//       (orm.em.findOne as jest.Mock).mockResolvedValue(null);

//       await controller.findProductByName(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(404);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'product not found'
//       });
//     });

//     it('should return 500 on server error', async () => {
//       const mockRequest = {
//         params: { name: 'Test Product' }
//       } as unknown as Request;

//       const errorMessage = 'Database error';
//       (orm.em.findOne as jest.Mock).mockRejectedValue(new Error(errorMessage));

//       await controller.findProductByName(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(500);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Internal server error',
//         error: errorMessage
//       });
//     });
// });

// describe('search', () => {
//     beforeEach(() => {
//       (orm.em.find as jest.Mock) = jest.fn();
//     });

//     it('should find products by name successfully', async () => {
//       const mockRequest = {
//         query: { query: 'test' }
//       } as unknown as Request;

//       const mockProducts = [
//         { 
//           id: '1', 
//           name: 'Test Product',
//           category: { id: '1', name: 'Category 1' }
//         },
//         { 
//           id: '2', 
//           name: 'Another Test',
//           category: { id: '1', name: 'Category 1' }
//         }
//       ];

//       (orm.em.find as jest.Mock).mockResolvedValue(mockProducts);

//       await controller.search(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(200);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'found products',
//         data: mockProducts
//       });
//     });

//     it('should return 400 when query parameter is missing', async () => {
//       const mockRequest = {
//         query: {}
//       } as unknown as Request;

//       await controller.search(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(400);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Query parameter is required'
//       });
//     });

//     it('should return empty array when no products match', async () => {
//       const mockRequest = {
//         query: { query: 'nonexistent' }
//       } as unknown as Request;

//       (orm.em.find as jest.Mock).mockResolvedValue([]);

//       await controller.search(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(200);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'found products',
//         data: []
//       });
//     });

//     it('should return 500 on server error', async () => {
//       const mockRequest = {
//         query: { query: 'test' }
//       } as unknown as Request;

//       const errorMessage = 'Database error';
//       (orm.em.find as jest.Mock).mockRejectedValue(new Error(errorMessage));

//       await controller.search(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(500);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Internal server error',
//         error: errorMessage
//       });
//     });
// });

// describe('verifyStock', () => {
//     beforeEach(() => {
//       (orm.em.findOne as jest.Mock) = jest.fn();
//     });

//     it('should verify sufficient stock successfully', async () => {
//       const mockRequest = {
//         params: { id: '1' },
//         query: { quantity: '5' }
//       } as unknown as Request;

//       const product = { 
//         id: '1', 
//         name: 'Test Product',
//         stock: 10
//       };

//       (orm.em.findOne as jest.Mock).mockResolvedValue(product);

//       await controller.verifyStock(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(200);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Stock suficiente',
//         availableStock: 10
//       });
//     });

//     it('should return 400 for insufficient stock', async () => {
//       const mockRequest = {
//         params: { id: '1' },
//         query: { quantity: '15' }
//       } as unknown as Request;

//       const product = { 
//         id: '1', 
//         name: 'Test Product',
//         stock: 10
//       };

//       (orm.em.findOne as jest.Mock).mockResolvedValue(product);

//       await controller.verifyStock(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(400);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Stock insuficiente para el articulo',
//         productName: 'Test Product',
//         availableStock: 10
//       });
//     });

//     it('should return 404 when product not found', async () => {
//       const mockRequest = {
//         params: { id: '999' },
//         query: { quantity: '5' }
//       } as unknown as Request;

//       (orm.em.findOne as jest.Mock).mockResolvedValue(null);

//       await controller.verifyStock(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(404);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Producto no encontrado'
//       });
//     });

//     it('should return 500 on server error', async () => {
//       const mockRequest = {
//         params: { id: '1' },
//         query: { quantity: '5' }
//       } as unknown as Request;

//       const errorMessage = 'Database error';
//       (orm.em.findOne as jest.Mock).mockRejectedValue(new Error(errorMessage));

//       await controller.verifyStock(mockRequest, mockResponse as Response);

//       expect(mockResponse.status).toHaveBeenCalledWith(500);
//       expect(mockResponse.json).toHaveBeenCalledWith({
//         message: 'Internal server error',
//         error: errorMessage
//       });
//     });
// });
// });