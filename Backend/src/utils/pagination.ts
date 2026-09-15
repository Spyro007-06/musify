import { env } from '@config/env';
import { IPaginationQuery, IPaginationMeta } from '@interfaces/IPagination';

/**
 * Parse and normalize pagination query parameters from a request.
 */
export const parsePagination = (query: {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}): Required<IPaginationQuery> => {
  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.min(
    env.MAX_PAGE_SIZE,
    Math.max(1, parseInt(String(query.limit || env.DEFAULT_PAGE_SIZE), 10)),
  );
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : 'createdAt';
  const sortOrder: 'asc' | 'desc' =
    query.sortOrder === 'asc' ? 'asc' : 'desc';
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  return { page, limit, sortBy, sortOrder, search };
};

/**
 * Build the Prisma skip/take arguments from page + limit.
 */
export const getPrismaSkipTake = (page: number, limit: number): { skip: number; take: number } => ({
  skip: (page - 1) * limit,
  take: limit,
});

/**
 * Build the standard pagination meta object.
 */
export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number,
): IPaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

