import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes passwords with Argon2id and verifies only the correct password', async () => {
    const password = 'correct horse battery staple';
    const passwordHash = await service.hash(password);

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(service.verify(passwordHash, password)).resolves.toBe(true);
    await expect(service.verify(passwordHash, 'incorrect password')).resolves.toBe(false);
  });
});
