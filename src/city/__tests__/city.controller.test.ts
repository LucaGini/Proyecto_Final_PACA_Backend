import { Request, Response } from "express";
import { orm } from "../../shared/db/orm.js";
import { City } from "../city.entity.js";
import { controller } from "../city.controller.js";

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

describe('City Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  // Let's start with findAll method
  describe('findAll', () => {
    it('should return all cities successfully', async () => {
      const mockCities = [
        { id: '1', name: 'City 1', postCode: '2000' },
        { id: '2', name: 'City 2', postCode: '2001' }
      ];

      (orm.em.find as jest.Mock).mockResolvedValue(mockCities);

      await controller.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found all cities',
        data: mockCities
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
    beforeEach(() => {
      (orm.em.findOneOrFail as jest.Mock) = jest.fn();
    });

    it('should find one city successfully', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const foundCity = { 
        id: '1', 
        name: 'Test City',
        postCode: '2000'
      };

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(foundCity);

      await controller.findOne(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found one city',
        data: foundCity
      });
    });

    it('should return 404 when city not found', async () => {
      const mockRequest = {
        params: { id: '999' }
      } as unknown as Request;

      (orm.em.findOneOrFail as jest.Mock).mockRejectedValue(new Error('City not found'));

      await controller.findOne(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'City not found'
      });
    });
});

describe('add', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
      (orm.em.create as jest.Mock) = jest.fn();
      (orm.em.flush as jest.Mock) = jest.fn();
    });

    it('should create a new city successfully', async () => {
      const mockRequest = {
        body: { 
          name: 'New City',
          postCode: '2000',
          province: { id: '1' }
        }
      } as unknown as Request;

      const newCity = { 
        id: '1',
        name: 'New City',
        postCode: '2000',
        province: { id: '1' }
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);
      (orm.em.create as jest.Mock).mockReturnValue(newCity);
      (orm.em.flush as jest.Mock).mockResolvedValue(undefined);

      await controller.add(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'City created successfully',
        data: newCity
      });
    });

    it('should return 303 when city already exists', async () => {
      const existingCity = { 
        id: '1',
        name: 'Existing City',
        postCode: '2000'
      };

      const mockRequest = {
        body: { 
          name: 'New City',
          postCode: '2000'
        }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(existingCity);

      await controller.add(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(303);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error',
        error: 'The city already exists'
      });
    });

    it('should return 404 on error', async () => {
      const mockRequest = {
        body: { 
          name: 'New City',
          postCode: '2000'
        }
      } as unknown as Request;

      const errorMessage = 'Database error';
      (orm.em.findOne as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await controller.add(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: errorMessage
      });
    });
});

describe('update', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
      (orm.em.assign as jest.Mock) = jest.fn();
      (orm.em.flush as jest.Mock) = jest.fn();
    });

    it('should update city successfully', async () => {
      const mockRequest = {
        params: { id: '1' },
        body: { 
          name: 'Updated City',
          postCode: '2001'
        }
      } as unknown as Request;

      let cityObject = { 
        id: '1', 
        name: 'Old City',
        postCode: '2000'
      };

      (orm.em.findOne as jest.Mock)
        .mockResolvedValueOnce(cityObject)
        .mockResolvedValueOnce(null);

      (orm.em.assign as jest.Mock).mockImplementation(() => {
        cityObject.name = mockRequest.body.name;
        cityObject.postCode = mockRequest.body.postCode;
        return cityObject;
      });

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'city updated',
        data: { id: '1', name: 'Updated City', postCode: '2001' }
      });
    });

    it('should return 404 when city not found', async () => {
      const mockRequest = {
        params: { id: '999' },
        body: { name: 'Updated City' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'City not found'
      });
    });

    it('should return 400 when postcode already exists', async () => {
      const mockRequest = {
        params: { id: '1' },
        body: { 
          name: 'Updated City',
          postCode: '2002' 
        }
      } as unknown as Request;

      const existingCity = { 
        id: '1', 
        name: 'Old City',
        postCode: '2000'
      };

      const duplicateCity = {
        id: '2',
        name: 'Another City',
        postCode: '2002'
      };

      (orm.em.findOne as jest.Mock)
        .mockResolvedValueOnce(existingCity)
        .mockResolvedValueOnce(duplicateCity);

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

    it('should delete city successfully', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const cityToDelete = { 
        id: '1', 
        name: 'City To Delete',
        postCode: '2000'
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(cityToDelete);
      (orm.em.find as jest.Mock).mockResolvedValue([]);
      (orm.em.removeAndFlush as jest.Mock).mockResolvedValue(undefined);

      await controller.remove(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'city deleted',
        data: cityToDelete
      });
    });

    it('should return 404 when city not found', async () => {
      const mockRequest = {
        params: { id: '999' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);

      await controller.remove(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'City not found'
      });
    });

    it('should return 400 when city has associated users', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const cityWithUsers = { 
        id: '1', 
        name: 'City With Users',
        postCode: '2000'
      };

      const associatedUsers = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' }
      ];

      (orm.em.findOne as jest.Mock).mockResolvedValue(cityWithUsers);
      (orm.em.find as jest.Mock).mockResolvedValue(associatedUsers);

      await controller.remove(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Error',
        error: 'The city has associated users.'
      });
    });
});

describe('findCityByPostCode', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
    });

    it('should find city by postcode successfully', async () => {
      const mockRequest = {
        params: { postCode: '2000' }
      } as unknown as Request;

      const foundCity = { 
        id: '1', 
        name: 'Test City',
        postCode: '2000'
      };

      (orm.em.findOne as jest.Mock).mockResolvedValue(foundCity);

      await controller.findCityByPostCode(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found one city',
        data: foundCity
      });
    });

    it('should return 404 when city not found', async () => {
      const mockRequest = {
        params: { postCode: '9999' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);

      await controller.findCityByPostCode(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'city not found'
      });
    });

    it('should return 500 on server error', async () => {
      const mockRequest = {
        params: { postCode: '2000' }
      } as unknown as Request;

      const errorMessage = 'Database error';
      (orm.em.findOne as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await controller.findCityByPostCode(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: errorMessage
      });
    });
});

describe('findUsersByCity', () => {
    beforeEach(() => {
      (orm.em.findOneOrFail as jest.Mock) = jest.fn();
      (orm.em.find as jest.Mock) = jest.fn();
    });

    it('should find users by city successfully', async () => {
      const mockRequest = {
        params: { postCode: '2000' }
      } as unknown as Request;

      const city = { 
        id: '1', 
        name: 'Test City',
        postCode: '2000'
      };

      const users = [
        { id: '1', name: 'User 1', city },
        { id: '2', name: 'User 2', city }
      ];

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(city);
      (orm.em.find as jest.Mock).mockResolvedValue(users);

      await controller.findUsersByCity(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found users by city',
        data: users
      });
    });

    it('should return 404 when city not found', async () => {
      const mockRequest = {
        params: { postCode: '9999' }
      } as unknown as Request;

      (orm.em.findOneOrFail as jest.Mock).mockRejectedValue(new Error('City not found'));

      await controller.findUsersByCity(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'City not found'
      });
    });

    it('should return empty array when city has no users', async () => {
      const mockRequest = {
        params: { postCode: '2000' }
      } as unknown as Request;

      const city = { 
        id: '1', 
        name: 'Test City',
        postCode: '2000'
      };

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(city);
      (orm.em.find as jest.Mock).mockResolvedValue([]);

      await controller.findUsersByCity(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'found users by city',
        data: []
      });
    });
});
});