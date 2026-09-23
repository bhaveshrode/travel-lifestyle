import request from 'supertest';
import {
  app,
  prismaMock,
  TEST_USER,
} from './app';

describe('Auth routes', () => {
  const registerBody = {
    email: TEST_USER.email,
    username: TEST_USER.username,
    password: 'password123',
    ethereumAddress: TEST_USER.ethereumAddress,
  };

  it('registers a new user', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: TEST_USER.userId,
      email: TEST_USER.email,
      username: TEST_USER.username,
      ethereumAddress: TEST_USER.ethereumAddress,
      createdAt: new Date('2026-01-01'),
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const res = await request(app).post('/api/v1/auth/register').send(registerBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(TEST_USER.email);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it('rejects duplicate registration', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: TEST_USER.userId });

    const res = await request(app).post('/api/v1/auth/register').send(registerBody);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User already exists');
  });

  it('validates register payload', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      username: 'ab',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('logs in an existing user', async () => {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('password123', 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: TEST_USER.userId,
      email: TEST_USER.email,
      username: TEST_USER.username,
      ethereumAddress: TEST_USER.ethereumAddress,
      passwordHash,
    });
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: TEST_USER.email,
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(TEST_USER.username);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('rejects invalid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/v1/auth/login').send({
      email: TEST_USER.email,
      password: 'password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('refreshes an access token', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: TEST_USER.userId,
      email: TEST_USER.email,
      username: TEST_USER.username,
      ethereumAddress: TEST_USER.ethereumAddress,
      createdAt: new Date(),
    });
    prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-3' });

    const registered = await request(app).post('/api/v1/auth/register').send({
      ...registerBody,
      email: 'refresh@example.com',
      username: 'refreshuser',
      ethereumAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    });
    const refreshToken = registered.body.data.refreshToken;

    prismaMock.refreshToken.findUnique.mockResolvedValue({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: TEST_USER.userId,
        ethereumAddress: TEST_USER.ethereumAddress,
        email: TEST_USER.email,
      },
    });

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('logs out by deleting the refresh token', async () => {
    prismaMock.refreshToken.delete.mockResolvedValue({ id: 'rt-4' });

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'any-token' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
    expect(prismaMock.refreshToken.delete).toHaveBeenCalled();
  });
});
