export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: IPaginationMeta;
}

export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface IApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{ field?: string; message: string }>;
  stack?: string;
}

