import { Request, Response } from "express";
import { orm } from "../../shared/db/orm.js";
import { Order } from "../order.entity.js";
import { controller } from "../order.controller.js";

jest.mock('../../shared/db/orm.js', () => ({
  orm: {
    em: {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn(),
      persistAndFlush: jest.fn()
    }
  }
}));

describe('Order Controller', () => {
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
    it('should return all orders successfully', async () => {
      const mockOrders = [
        { 
          id: '1', 
          status: 'pending',
          orderDate: new Date(),
          user: {
            id: '1',
            firstName: 'John',
            lastName: 'Doe'
          }
        }
      ];

      (orm.em.find as jest.Mock).mockResolvedValue(mockOrders);

      await controller.findAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Orders found successfully',
        data: mockOrders
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
    it('should find one order successfully', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const foundOrder = {
        id: '1',
        status: 'pending',
        orderDate: new Date(),
        user: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(foundOrder);

      await controller.findOne(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order found successfully',
        data: foundOrder
      });
    });

    it('should return 404 when order not found', async () => {
      const mockRequest = {
        params: { id: '999' }
      } as unknown as Request;

      (orm.em.findOneOrFail as jest.Mock).mockRejectedValue(new Error('Order not found'));

      await controller.findOne(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order not found'
      });
    });
  });

  describe('create', () => {
    it('should create order successfully', async () => {
      const mockRequest = {
        body: {
          userId: '1',
          orderItems: [
            { productId: '1', quantity: 2, unitPrice: 100 }
          ],
          total: 200
        }
      } as unknown as Request;

      const mockUser = { id: '1', firstName: 'John', lastName: 'Doe' };
      const mockProduct = { id: '1', name: 'Product 1', stock: 5 };
      const mockOrder = {
        id: '1',
        status: 'pending',
        orderDate: expect.any(Date),
        user: mockUser,
        orderItems: [
          { productId: '1', quantity: 2, unitPrice: 100, subtotal: 200 }
        ],
        total: 200
      };

      (orm.em.findOneOrFail as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockProduct);
      (orm.em.create as jest.Mock).mockReturnValue(mockOrder);
      (orm.em.persistAndFlush as jest.Mock).mockResolvedValue(undefined);

      await controller.create(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order created successfully',
        data: mockOrder
      });
    });
  });

describe('update', () => {
    beforeEach(() => {
      (orm.em.findOneOrFail as jest.Mock) = jest.fn();
      (orm.em.persistAndFlush as jest.Mock) = jest.fn();
    });

    it('should update order status successfully', async () => {
      const mockRequest = {
        params: { id: '1' },
        body: { 
          status: 'completed'
        }
      } as unknown as Request;

      const updatedOrder = {
        id: '1',
        status: 'completed',
        updatedDate: new Date(),
        orderItems: []
      };

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(updatedOrder);

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order updated successfully',
        data: updatedOrder
      });
    });

    it('should return 404 when order not found', async () => {
      const mockRequest = {
        params: { id: '999' }
      } as unknown as Request;

      (orm.em.findOneOrFail as jest.Mock).mockRejectedValue(new Error('Not found'));

      await controller.update(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order not found'
      });
    });
});

describe('remove', () => {
    beforeEach(() => {
      (orm.em.findOneOrFail as jest.Mock) = jest.fn();
      (orm.em.removeAndFlush as jest.Mock) = jest.fn();
    });

    it('should delete order successfully', async () => {
      const mockRequest = {
        params: { id: '1' }
      } as unknown as Request;

      const orderToDelete = {
        id: '1',
        status: 'pending'
      };

      (orm.em.findOneOrFail as jest.Mock).mockResolvedValue(orderToDelete);

      await controller.remove(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Order deleted successfully',
        data: orderToDelete
      });
    });
});

describe('findOrdersByEmail', () => {
    beforeEach(() => {
      (orm.em.findOne as jest.Mock) = jest.fn();
      (orm.em.find as jest.Mock) = jest.fn();
    });

    it('should find orders by email successfully', async () => {
      const mockRequest = {
        params: { email: 'test@test.com' }
      } as unknown as Request;

      const mockUser = { 
        id: '1', 
        email: 'test@test.com' 
      };

      const mockOrders = [
        { 
          id: '1',
          status: 'pending',
          orderItems: []
        }
      ];

      (orm.em.findOne as jest.Mock).mockResolvedValue(mockUser);
      (orm.em.find as jest.Mock).mockResolvedValue(mockOrders);

      await controller.findOrdersByEmail(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Orders found successfully',
        data: mockOrders
      });
    });

    it('should return 404 when user not found', async () => {
      const mockRequest = {
        params: { email: 'nonexistent@test.com' }
      } as unknown as Request;

      (orm.em.findOne as jest.Mock).mockResolvedValue(null);

      await controller.findOrdersByEmail(mockRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User not found'
      });
    });
});
});