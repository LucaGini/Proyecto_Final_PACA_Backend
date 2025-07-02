import { Request, Response } from "express";
import { orm } from "../../shared/db/orm.js";
import { Supplier } from "../supplier.entity.js";
import { controller } from "../supplier.controller.js";

jest.mock('../../shared/db/orm.js', () => ({
  orm: {
    em: {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn(),
      flush: jest.fn()
    }
  }
}));

describe('Supplier Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('findAll', () => {
    it('should return all suppliers successfully', async () => {
      const mockSuppliers = [
        { id: '1', name: 'Supplier 1', cuit: 20111111112 },
        { id: '2', name: 'Supplier 2', cuit: 20222222222 }
      ];

      (orm.em.find as jest.Mock).mockResolvedValue(mockSuppliers);

      await controller.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found all products',
        data: mockSuppliers
      });
    });

    it('should return 404 when there is an error', async () => {
      const errorMessage = 'Database error';
      (orm.em.find as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await controller.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: errorMessage
      });
    });
  });

  describe('findOne', () => {
    it('should find one supplier successfully', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const foundSupplier = { 
        id: '1', 
        name: 'Test Supplier',
        cuit: 20111111112
      };

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(foundSupplier);

      await controller.findOne(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found one supplier',
        data: foundSupplier
      });
    });

    it('should return 404 when supplier not found', async () => {
      const mockRequest = {
        params: { id: '999' }
      } as unknown as Request;

      (orm.em.findOneOrFail as jest.Mock).mockRejectedValue(new Error('Supplier not found'));

      await controller.findOne(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Supplier not found'
      });
    });
  });

  describe('add', () => {
    it('should create a new supplier successfully', async () => {
      const mockRequest = {
        body: {
          name: 'New Supplier',
          cuit: 20333333332
        }
      } as unknown as Request;

      const newSupplier = {
        id: '1',
        name: 'New Supplier',
        cuit: 20333333332
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);
      (orm.em.create as jest.Mock).mockReturnValue(newSupplier);

      await controller.add(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Supplier created successfully',
        data: newSupplier
      });
    });

    it('should return 303 when supplier already exists', async () => {
      const mockRequest = {
        body: {
          name: 'Existing Supplier',
          cuit: 20111111112
        }
      } as unknown as Request;

      const existingSupplier = {
        id: '1',
        name: 'Existing Supplier',
        cuit: 20111111112
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(existingSupplier);

      await controller.add(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(303);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error',
        error: 'The supplier already exists'
      });
    });
  });

describe('update', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
      (orm.em.assign as jest.Mock) = jest.fn();
      (orm.em.flush as jest.Mock) = jest.fn();
    });

    it('should update supplier successfully', async () => {
      const mockRequest = {
        params: { id: '1' },
        body: { 
          name: 'Updated Supplier',
          Cuit: 20444444442
        }
      } as unknown as Request;

      const updatedSupplier = {
        id: '1',
        name: 'Updated Supplier',
        cuit: 20444444442
      };

      (orm.em.findOne as jest.Mock)
        .mockResolvedValueOnce(updatedSupplier)
        .mockResolvedValueOnce(null);
      (orm.em.assign as jest.Mock).mockReturnValue(updatedSupplier);

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'supplier updated',
        data: updatedSupplier
      });
    });
});

describe('remove', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
      (orm.em.find as jest.Mock) = jest.fn();
      (orm.em.removeAndFlush as jest.Mock) = jest.fn();
    });

    it('should remove supplier successfully', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const supplierToDelete = {
        id: '1',
        name: 'Supplier to Delete',
        cuit: 20111111112
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(supplierToDelete);
      (orm.em.find as jest.Mock).mockResolvedValue([]);

      await controller.remove(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'supplier deleted',
        data: supplierToDelete
      });
    });
});

describe('findProductsBySupplier', () => {
    beforeEach(() => {
      (orm.em.findOneOrFail as jest.Mock) = jest.fn();
      (orm.em.find as jest.Mock) = jest.fn();
    });

    it('should find products by supplier successfully', async () => {
      const mockRequest = {
        params: { cuit: '20111111112' }
      } as unknown as Request;

      const supplier = {
        id: '1',
        name: 'Test Supplier',
        cuit: 20111111112
      };

      const products = [
        { id: '1', name: 'Product 1', supplier },
        { id: '2', name: 'Product 2', supplier }
      ];

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(supplier);
      (orm.em.find as jest.Mock).mockResolvedValue(products);

      await controller.findProductsBySupplier(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found products by supplier',
        data: products
      });
    });
});

describe('findSupplierByCuit', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
    });

    it('should find supplier by CUIT successfully', async () => {
      const mockRequest = {
        params: { cuit: '20111111112' }
      } as unknown as Request;

      const supplier = {
        id: '1',
        name: 'Test Supplier',
        cuit: 20111111112
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(supplier);

      await controller.findSupplierByCuit(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found one supplier',
        data: supplier
      });
    });

    it('should return 404 when supplier not found', async () => {
      const mockRequest = {
        params: { cuit: '20999999992' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);

      await controller.findSupplierByCuit(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'supplier not found'
      });
    });
});
});