import { Request, Response } from "express";
import { orm } from "../../shared/db/orm.js";
import { Category } from "../category.entity.js";
import { controller } from "../category.controller.js";

// Mock orm
jest.mock('../../shared/db/orm.js', () => ({
  orm: {
    em: {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn(),
      flush: jest.fn(),
      assign: jest.fn(),
      removeAndFlush: jest.fn()
    }
  }
}));

describe('Category Controller', () => {
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
    it('should return all categories successfully', async () => {
      const mockCategories = [
        { id: '1', name: 'Category 1' },
        { id: '2', name: 'Category 2' }
      ];

      (orm.em.find as jest.Mock).mockResolvedValue(mockCategories);

      await controller.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found all categories',
        data: mockCategories
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
    it('should find one category successfully', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const foundCategory = { 
        id: '1', 
        name: 'Test Category'
      };

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(foundCategory);

      await controller.findOne(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found one category',
        data: foundCategory
      });
    });

    it('should return 404 when category not found', async () => {
      const mockRequest = {
        params: { id: '999' }
      } as unknown as Request;

      (orm.em.findOneOrFail as jest.Mock).mockRejectedValue(new Error('Category not found'));

      await controller.findOne(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Category not found'
      });
    });
  });

describe('add', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
      (orm.em.create as jest.Mock) = jest.fn();
      (orm.em.flush as jest.Mock) = jest.fn();
    });

    it('should create a new category successfully', async () => {
      const mockRequest = {
        body: { name: 'New Category' }
      } as unknown as Request;

      const newCategory = { 
        id: '1', 
        name: 'New Category'
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);
      (orm.em.create as jest.Mock).mockReturnValue(newCategory);

      await controller.add(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Category created successfully',
        data: newCategory
      });
    });

    it('should return 303 when category already exists', async () => {
      const existingCategory = { 
        id: '1', 
        name: 'Existing Category'
      };

      const mockRequest = {
        body: { name: 'Existing Category' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(existingCategory);

      await controller.add(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(303);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error',
        error: 'The category already exists'
      });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
      (orm.em.assign as jest.Mock) = jest.fn();
      (orm.em.flush as jest.Mock) = jest.fn();
    });

    it('should update category successfully', async () => {
      const mockRequest = {
        params: { id: '1' },
        body: { name: 'Updated Category' }
      } as unknown as Request;

      const updatedCategory = {
        id: '1',
        name: 'Updated Category'
      };

      (orm.em.findOne as jest.Mock)
        .mockResolvedValueOnce(updatedCategory)
        .mockResolvedValueOnce(null);

      (orm.em.assign as jest.Mock).mockReturnValue(updatedCategory);

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'category updated',
        data: updatedCategory
      });
    });

    it('should return 404 when category not found', async () => {
      const mockRequest = {
        params: { id: '999' },
        body: { name: 'Updated Category' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Category not found'
      });
    });

    it('should return 400 when new name already exists', async () => {
      const mockRequest = {
        params: { id: '1' },
        body: { name: 'Existing Category' }
      } as unknown as Request;

      const existingCategory = { 
        id: '1', 
        name: 'Old Category'
      };

      const duplicateCategory = {
        id: '2',
        name: 'Existing Category'
      };

      (orm.em.findOne as jest.Mock)
        .mockResolvedValueOnce(existingCategory)
        .mockResolvedValueOnce(duplicateCategory);

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error',
        error: 'The new name is already used'
      });
    });
  });

describe('remove', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
      (orm.em.find as jest.Mock) = jest.fn();
      (orm.em.removeAndFlush as jest.Mock) = jest.fn();
    });

    it('should delete category successfully', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const categoryToDelete = { 
        id: '1', 
        name: 'Category To Delete'
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(categoryToDelete);
      (orm.em.find as jest.Mock).mockResolvedValue([]);
      (orm.em.removeAndFlush as jest.Mock).mockResolvedValue(undefined);

      await controller.remove(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'category deleted',
        data: categoryToDelete
      });
    });

    it('should return 400 when category has associated products', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const category = { id: '1', name: 'Category' };
      const products = [{ id: '1', name: 'Product 1' }];

      (orm.em.findOne as jest.Mock).mockResolvedValue(category);
      (orm.em.find as jest.Mock).mockResolvedValue(products);

      await controller.remove(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error',
        error: 'The category has associated products.'
      });
    });
});

describe('findProductsByCategory', () => {
    beforeEach(() => {
      (orm.em.findOneOrFail as jest.Mock) = jest.fn();
      (orm.em.find as jest.Mock) = jest.fn();
    });

    it('should find products by category successfully', async () => {
      const mockRequest = {
        params: { name: 'Test Category' }
      } as unknown as Request;

      const category = { id: '1', name: 'Test Category' };
      const products = [
        { id: '1', name: 'Product 1', category },
        { id: '2', name: 'Product 2', category }
      ];

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(category);
      (orm.em.find as jest.Mock).mockResolvedValue(products);

      await controller.findProductsByCategory(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found products by category',
        data: products
      });
    });
});

describe('findCategoryByName', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
    });

    it('should find category by name successfully', async () => {
      const mockRequest = {
        params: { name: 'Test Category' }
      } as unknown as Request;

      const category = { 
        id: '1', 
        name: 'Test Category'
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(category);

      await controller.findCategoryByName(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found one category',
        data: category
      });
    });

    it('should return 404 when category not found', async () => {
      const mockRequest = {
        params: { name: 'Non Existent' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);

      await controller.findCategoryByName(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'category not found'
      });
    });
});
});