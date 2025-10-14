import bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../interfaces';

export class PasswordHasher implements IPasswordHasher {
  private readonly saltRounds: number;

  constructor(saltRounds: number = 12) {
    this.saltRounds = saltRounds;
  }

  async hash(password: string): Promise<string> {
    if (!password || password.length < 1) {
      throw new Error('Password cannot be empty');
    }

    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    return bcrypt.compare(password, hash);
  }
}