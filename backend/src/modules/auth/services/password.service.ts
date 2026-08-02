import { Injectable } from '@nestjs/common';
import { hash, verify, argon2id } from 'argon2';

const ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService {
  private dummyHashPromise?: Promise<string>;

  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  async consumeDummyVerification(password: string): Promise<void> {
    this.dummyHashPromise ??= this.hash('not-a-real-user-password');
    const dummyHash = await this.dummyHashPromise;
    await this.verify(dummyHash, password);
  }
}
