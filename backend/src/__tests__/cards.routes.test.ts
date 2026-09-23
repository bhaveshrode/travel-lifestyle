import request from 'supertest';
import {
  app,
  prismaMock,
  cacheMock,
  ethereumMock,
  authHeader,
  mockCard,
  mockTx,
} from './app';

describe('Cards routes', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/cards/my');
    expect(res.status).toBe(401);
  });

  it('creates a travel card and syncs chain balances', async () => {
    prismaMock.travelCard.findUnique.mockResolvedValue(null);
    prismaMock.travelCard.create.mockResolvedValue(mockCard({ balance: 100n }));
    prismaMock.transaction.create.mockResolvedValue(mockTx());
    ethereumMock.createTravelCard.mockResolvedValue('0xcreate');
    ethereumMock.getTravelCardBalance.mockResolvedValue('100');
    ethereumMock.getCryptoBalance.mockResolvedValue('0');
    prismaMock.travelCard.update.mockResolvedValue(mockCard({ balance: 100n }));
    prismaMock.transaction.update.mockResolvedValue(mockTx({ status: 'CONFIRMED' }));

    const res = await request(app)
      .post('/api/v1/cards')
      .set(authHeader())
      .send({ initialBalance: 100, currency: 'USD' });

    expect(res.status).toBe(201);
    expect(res.body.data.txHash).toBe('0xcreate');
    expect(res.body.data.card.balance).toBe('100');
    expect(ethereumMock.createTravelCard).toHaveBeenCalled();
  });

  it('rejects a second travel card', async () => {
    prismaMock.travelCard.findUnique.mockResolvedValue(mockCard());

    const res = await request(app)
      .post('/api/v1/cards')
      .set(authHeader())
      .send({ initialBalance: 100, currency: 'USD' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('User already has a travel card');
  });

  it('returns 502 when card creation fails on chain', async () => {
    prismaMock.travelCard.findUnique.mockResolvedValue(null);
    prismaMock.travelCard.create.mockResolvedValue(mockCard());
    prismaMock.transaction.create.mockResolvedValue(mockTx());
    ethereumMock.createTravelCard.mockRejectedValue(new Error('rpc down'));
    prismaMock.transaction.update.mockResolvedValue(mockTx({ status: 'FAILED' }));

    const res = await request(app)
      .post('/api/v1/cards')
      .set(authHeader())
      .send({ initialBalance: 100, currency: 'USD' });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('rpc down');
  });

  it('gets the current card and caches it', async () => {
    cacheMock.get.mockResolvedValue(null);
    prismaMock.travelCard.findUnique.mockResolvedValue(mockCard());
    ethereumMock.getTravelCardBalance.mockResolvedValue('1500');
    ethereumMock.getCryptoBalance.mockResolvedValue('10');
    prismaMock.travelCard.update.mockResolvedValue(mockCard({ balance: 1500n }));

    const res = await request(app).get('/api/v1/cards/my').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe('1500');
    expect(cacheMock.set).toHaveBeenCalled();
  });

  it('returns 404 when the user has no card', async () => {
    cacheMock.get.mockResolvedValue(null);
    prismaMock.travelCard.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/cards/my').set(authHeader());

    expect(res.status).toBe(404);
  });

  it('loads funds onto a card', async () => {
    prismaMock.travelCard.findUnique.mockResolvedValue(mockCard());
    prismaMock.transaction.create.mockResolvedValue(mockTx({ type: 'CARD_LOAD_FUNDS' }));
    ethereumMock.loadFunds.mockResolvedValue('0xload');
    ethereumMock.getTravelCardBalance.mockResolvedValue('1100');
    ethereumMock.getCryptoBalance.mockResolvedValue('0');
    prismaMock.travelCard.update.mockResolvedValue(mockCard({ balance: 1100n }));
    prismaMock.transaction.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/cards/load-funds')
      .set(authHeader())
      .send({ amount: 100 });

    expect(res.status).toBe(200);
    expect(res.body.data.txHash).toBe('0xload');
  });

  it('converts fiat to crypto', async () => {
    prismaMock.travelCard.findUnique.mockResolvedValue(mockCard({ balance: 1000n }));
    prismaMock.transaction.create.mockResolvedValue(mockTx({ type: 'CARD_CONVERT_CRYPTO' }));
    ethereumMock.convertToCrypto.mockResolvedValue('0xconvert');
    ethereumMock.getTravelCardBalance.mockResolvedValue('900');
    ethereumMock.getCryptoBalance.mockResolvedValue('1000');
    prismaMock.travelCard.update.mockResolvedValue(mockCard());
    prismaMock.transaction.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/cards/convert-to-crypto')
      .set(authHeader())
      .send({ amount: 100 });

    expect(res.status).toBe(200);
    expect(res.body.data.txHash).toBe('0xconvert');
  });

  it('rejects conversion when the balance is too low', async () => {
    prismaMock.travelCard.findUnique.mockResolvedValue(mockCard({ balance: 10n }));

    const res = await request(app)
      .post('/api/v1/cards/convert-to-crypto')
      .set(authHeader())
      .send({ amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Insufficient balance');
  });
});
