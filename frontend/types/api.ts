export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  errors?: Array<{ field?: string; message: string }>;
  requestId?: string;
}

export class ApiError extends Error {
  public status: number;
  public data?: unknown;
  public errors?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    status = 500,
    data?: unknown,
    errors?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.errors = errors;
  }
}
