import { Request } from 'express';
import { IUser } from '@interfaces/IUser';

// Augment Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export type AuthenticatedRequest = Request & {
  user: IUser;
};

export type OptionalAuthRequest = Request & {
  user?: IUser;
};


