import type { User } from 'app/schemas/auth/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
