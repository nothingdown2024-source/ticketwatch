import type { UserRole } from '@ticketwatch/database';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
