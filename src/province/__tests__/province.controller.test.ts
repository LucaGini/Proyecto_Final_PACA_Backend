import { Request, Response } from "express";
import { orm } from "../../shared/db/orm.js";
import { Province } from "../province.entity.js";
import { controller } from "../province.controller.js";

//Mock orm
jest.mock('../../shared/db/orm.js', () => ({
  orm: {
    em: {
      find: jest.fn()
    }
  }
}));

describe('Province Controller', () => {
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
    it('should return all provinces successfully', async () => {
      const mockProvinces = [{ id: 1, name: 'Test Province' }];
      (orm.em.find as jest.Mock).mockResolvedValue(mockProvinces);

      await controller.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found all provinces',
        data: mockProvinces
      });
    });

    it('should return 500 when there is an error', async () => {
      const errorMessage = 'Database error';
      (orm.em.find as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await controller.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: errorMessage
      });
    });
  });

  describe('findOne', () => {
    it('should return one province successfully', async () => {
      const mockProvince = { id: '1', name: 'Test Province' };
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;
      
      (orm.em.findOneOrFail as jest.Mock) = jest.fn().mockResolvedValue(mockProvince);

      await controller.findOne(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found one Province', // Changed to match controller's exact message
        data: mockProvince
      });
    });

    it('should return 404 when province not found', async () => {
      const mockRequest = {
        params: { id: '999' }
      } as unknown as Request;

      (orm.em.findOneOrFail as jest.Mock) = jest.fn().mockRejectedValue(new Error('Not found'));
      
      await controller.findOne(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Not found'
      });
    });
  });

describe('add', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
      (orm.em.create as jest.Mock) = jest.fn();
      (orm.em.flush as jest.Mock) = jest.fn();
    });

    it('should create a new province successfully', async () => {
      const mockProvince = { id: '1', name: 'New Province' };
      const mockRequest = {
        body: { name: 'New Province' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);
      (orm.em.create as jest.Mock).mockReturnValue(mockProvince);
      
      await controller.add(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Province created successfully',
        data: mockProvince
      });
    });

    it('should return 303 when province already exists', async () => {
      const existingProvince = { id: '1', name: 'Existing Province' };
      const mockRequest = {
        body: { name: 'Existing Province' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(existingProvince);
      
      await controller.add(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(303);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error',
        error: 'The province already exists'
      });
    });
});

describe('update', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
      (orm.em.assign as jest.Mock) = jest.fn();
      (orm.em.flush as jest.Mock) = jest.fn();
      (orm.em.persist as jest.Mock) = jest.fn();
    });

    it('should update province successfully', async () => {
      const mockRequest = {
        params: { id: '1' },
        body: { name: 'New Name' }
      } as unknown as Request;

      // Create mutable province object
      let provinceObject = { 
        id: '1', 
        name: 'Old Name'
      };

      // Mock findOne to return our mutable object
      (orm.em.findOne as jest.Mock)
        .mockResolvedValueOnce(provinceObject)
        .mockResolvedValueOnce(null);

      // Mock assign to actually update the name
      (orm.em.assign as jest.Mock).mockImplementation(() => {
        provinceObject.name = mockRequest.body.name;
        return provinceObject;
      });

      // Mock persist and flush
      (orm.em.persist as jest.Mock).mockResolvedValue(provinceObject);
      (orm.em.flush as jest.Mock).mockResolvedValue(undefined);

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Province updated',
        data: { id: '1', name: 'New Name' }
      });
    });

    it('should return 404 when province not found', async () => {
      const mockRequest = {
        params: { id: '999' },
        body: { name: 'New Name' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Province not found'
      });
    });

    it('should return 303 when new name already exists', async () => {
      const existingProvince = { id: '1', name: 'Old Name' };
      const duplicateProvince = { id: '2', name: 'New Name' };
      const mockRequest = {
        params: { id: '1' },
        body: { name: 'New Name' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock)
        .mockResolvedValueOnce(existingProvince)  // First call for existing province
        .mockResolvedValueOnce(duplicateProvince); // Second call for duplicate check

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(303);
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

    it('should delete province successfully', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const provinceToDelete = { 
        id: '1', 
        name: 'Province To Delete' 
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(provinceToDelete);
      (orm.em.find as jest.Mock).mockResolvedValue([]);
      (orm.em.removeAndFlush as jest.Mock).mockResolvedValue(undefined);

      await controller.remove(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Province deleted',
        data: provinceToDelete
      });
    });

    it('should return 404 when province not found', async () => {
      const mockRequest = {
        params: { id: '999' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);

      await controller.remove(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Province not found'
      });
    });

    it('should return 400 when province has associated cities', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const provinceWithCities = { 
        id: '1', 
        name: 'Province With Cities' 
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(provinceWithCities);
      (orm.em.find as jest.Mock).mockResolvedValue([{ id: '1', name: 'City 1' }]);

      await controller.remove(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error',
        error: 'The province has associated cities.'
      });
    });
});

describe('findProvinceByName', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
    });

    it('should find province by name successfully', async () => {
      const mockRequest = {
        params: { name: 'Test Province' }
      } as unknown as Request;

      const foundProvince = { 
        id: '1', 
        name: 'Test Province' 
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(foundProvince);

      await controller.findProvinceByName(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found one province',
        data: foundProvince
      });
    });

    it('should return 404 when province not found', async () => {
      const mockRequest = {
        params: { name: 'Non Existent Province' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);

      await controller.findProvinceByName(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'province not found'
      });
    });

    it('should return 500 on server error', async () => {
      const mockRequest = {
        params: { name: 'Test Province' }
      } as unknown as Request;

      const errorMessage = 'Database error';
      (orm.em.findOne as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await controller.findProvinceByName(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: errorMessage
      });
    });
});

describe('findCitiesByProvince', () => {
    beforeEach(() => {
      (orm.em.findOneOrFail as jest.Mock) = jest.fn();
      (orm.em.find as jest.Mock) = jest.fn();
    });

    it('should find cities by province successfully', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const province = { 
        id: '1', 
        name: 'Test Province' 
      };

      const cities = [
        { id: '1', name: 'City 1', province },
        { id: '2', name: 'City 2', province }
      ];

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(province);
      (orm.em.find as jest.Mock).mockResolvedValue(cities);

      await controller.findCitiesByProvince(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found cities by province',
        data: cities
      });
    });

    it('should return 404 when province not found', async () => {
      const mockRequest = {
        params: { id: '999' }
      } as unknown as Request;

      (orm.em.findOneOrFail as jest.Mock).mockRejectedValue(new Error('Province not found'));

      await controller.findCitiesByProvince(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Province not found'
      });
    });

    it('should return empty array when province has no cities', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const province = { 
        id: '1', 
        name: 'Test Province' 
      };

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(province);
      (orm.em.find as jest.Mock).mockResolvedValue([]);

      await controller.findCitiesByProvince(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found cities by province',
        data: []
      });
    });
});
});

