import request from 'supertest';
import {
  app,
  prismaMock,
  cacheMock,
  ethereumMock,
  authHeader,
  mockPoints,
  mockTx,
} from './app';

describe('Points routes', () => {
  it('creates a points account', async () => {
    prismaMock.pointsAccount.findUnique.mockResolvedValue(null);
    ethereumMock.createPointsAccount.mockResolvedValue('0xpoints');
    ethereumMock.getPointsBalance.mockResolvedValue('250');
    ethereumMock.getPointsCryptoValue.mockResolvedValue('0');
    prismaMock.pointsAccount.create.mockResolvedValue(mockPoints());
    prismaMock.transaction.create.mockResolvedValue(mockTx({ type: 'POINTS_CREATE' }));

    const res = await request(app)
      .post('/api/v1/points')
      .set(authHeader())
      .send({ points: 250, cryptoValue: 0 });

    expect(res.status).toBe(201);
    expect(res.body.data.txHash).toBe('0xpoints');
    expect(res.body.data.account.points).toBe('250');
  });

  it('rejects a duplicate points account', async () => {
    prismaMock.pointsAccount.findUnique.mockResolvedValue(mockPoints());

    const res = await request(app)
      .post('/api/v1/points')
      .set(authHeader())
      .send({ points: 250, cryptoValue: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Points account already exists');
  });

  it('returns the current points account', async () => {
    cacheMock.get.mockResolvedValue(null);
    prismaMock.pointsAccount.findUnique.mockResolvedValue(mockPoints());
    ethereumMock.getPointsBalance.mockResolvedValue('300');
    ethereumMock.getPointsCryptoValue.mockResolvedValue('0');
    prismaMock.pointsAccount.update.mockResolvedValue(mockPoints({ points: 300n }));

    const res = await request(app).get('/api/v1/points/my').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.points).toBe('300');
  });

  it('adds points', async () => {
    prismaMock.pointsAccount.findUnique.mockResolvedValue(mockPoints());
    prismaMock.transaction.create.mockResolvedValue(mockTx({ type: 'POINTS_ADD' }));
    ethereumMock.addPoints.mockResolvedValue('0xadd');
    ethereumMock.getPointsBalance.mockResolvedValue('350');
    ethereumMock.getPointsCryptoValue.mockResolvedValue('0');
    prismaMock.pointsAccount.update.mockResolvedValue(mockPoints({ points: 350n }));
    prismaMock.transaction.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/points/add')
      .set(authHeader())
      .send({ pointsToAdd: 100, reason: 'flight' });

    expect(res.status).toBe(200);
    expect(res.body.data.txHash).toBe('0xadd');
  });

  it('swaps points for crypto', async () => {
    prismaMock.pointsAccount.findUnique.mockResolvedValue(mockPoints({ points: 250n }));
    ethereumMock.getExchangeRate.mockResolvedValue('100');
    prismaMock.transaction.create.mockResolvedValue(mockTx({ type: 'POINTS_SWAP' }));
    ethereumMock.swapPoints.mockResolvedValue({
      txHash: '0xswap',
      cryptoEarned: '2000000000000000000',
    });
    ethereumMock.getPointsBalance.mockResolvedValue('50');
    ethereumMock.getPointsCryptoValue.mockResolvedValue('2000000000000000000');
    prismaMock.pointsAccount.update.mockResolvedValue(mockPoints());
    prismaMock.transaction.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/points/swap')
      .set(authHeader())
      .send({ pointsToSwap: 200 });

    expect(res.status).toBe(200);
    expect(res.body.data.txHash).toBe('0xswap');
    expect(res.body.data.cryptoEarned).toBe('2');
    expect(res.body.data.exchangeRate).toBe(100);
  });

  it('rejects a swap when points are insufficient', async () => {
    prismaMock.pointsAccount.findUnique.mockResolvedValue(mockPoints({ points: 10n }));

    const res = await request(app)
      .post('/api/v1/points/swap')
      .set(authHeader())
      .send({ pointsToSwap: 200 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Insufficient points balance');
  });

  it('returns the exchange rate', async () => {
    cacheMock.get.mockResolvedValue(null);
    ethereumMock.getExchangeRate.mockResolvedValue('100');

    const res = await request(app).get('/api/v1/points/exchange-rate').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.pointsPerCrypto).toBe(100);
  });

  it('returns points history and stats', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([
      mockTx({ type: 'POINTS_ADD', amount: 50n, status: 'CONFIRMED' }),
    ]);
    prismaMock.transaction.count.mockResolvedValue(1);

    const history = await request(app).get('/api/v1/points/history').set(authHeader());
    expect(history.status).toBe(200);
    expect(history.body.data.transactions[0].amount).toBe('50');

    cacheMock.get.mockResolvedValue(null);
    prismaMock.pointsAccount.findUnique.mockResolvedValue(mockPoints());
    prismaMock.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 50n } })
      .mockResolvedValueOnce({ _sum: { amount: 0n } });
    prismaMock.transaction.count.mockResolvedValue(1);

    const stats = await request(app).get('/api/v1/points/stats').set(authHeader());
    expect(stats.status).toBe(200);
    expect(stats.body.data.currentPoints).toBe('250');
    expect(stats.body.data.totalPointsAdded).toBe('50');
  });
});
