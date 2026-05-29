import type { User } from 'app/schemas/auth/auth.js';
import { ApiError } from 'app/utils/ApiError.js';
import type { Request } from 'express';

export function getAuthUser(req: Request): User {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  return req.user;
}
