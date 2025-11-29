// Pagination interfaces and types
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  message: string;
  data: T[];
  pagination: PaginationMetadata;
}

export class PaginationHelper {
  static readonly DEFAULT_PAGE = 1;
  static readonly DEFAULT_LIMIT = 20;
  static readonly MAX_LIMIT = 100;

  static validateAndNormalize(query: PaginationQuery): { page: number; limit: number; offset: number } {
    const page = Math.max(1, Math.floor(Number(query.page)) || this.DEFAULT_PAGE);
    const limit = Math.min(
      this.MAX_LIMIT,
      Math.max(1, Math.floor(Number(query.limit)) || this.DEFAULT_LIMIT)
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  static createMetadata(
    currentPage: number,
    itemsPerPage: number,
    totalItems: number
  ): PaginationMetadata {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  }

  static createResponse<T>(
    data: T[],
    currentPage: number,
    itemsPerPage: number,
    totalItems: number,
    message: string = 'Data retrieved successfully'
  ): PaginatedResponse<T> {
    return {
      message,
      data,
      pagination: this.createMetadata(currentPage, itemsPerPage, totalItems),
    };
  }
}