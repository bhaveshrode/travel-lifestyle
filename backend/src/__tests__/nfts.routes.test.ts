import request from 'supertest';
import {
  app,
  prismaMock,
  cacheMock,
  ethereumMock,
  authHeader,
  mockNft,
  TEST_USER,
} from './app';

describe('NFT routes', () => {
  it('lists featured marketplace NFTs without auth', async () => {
    cacheMock.get.mockResolvedValue(null);
    prismaMock.nFT.findMany.mockResolvedValue([
      mockNft({ isListed: true, user: { username: 'alice', avatar: null } }),
    ]);

    const res = await request(app).get('/api/v1/nfts/marketplace/featured');

    expect(res.status).toBe(200);
    expect(res.body.data[0].nftId).toBe('0');
    expect(res.body.data[0].price).toBe('100');
  });

  it('mints an NFT', async () => {
    ethereumMock.mintNFT.mockResolvedValue({ txHash: '0xmint', tokenId: '7' });
    prismaMock.nFT.create.mockResolvedValue(mockNft({ nftId: 7n }));
    prismaMock.transaction.create.mockResolvedValue({ id: 'tx-nft' });

    const res = await request(app)
      .post('/api/v1/nfts')
      .set(authHeader())
      .send({
        description: 'Kyoto temple tour',
        price: 100,
        category: 'culture',
        location: 'Kyoto',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.txHash).toBe('0xmint');
    expect(res.body.data.nft.nftId).toBe('7');
  });

  it('lists the current user NFTs', async () => {
    cacheMock.get.mockResolvedValue(null);
    prismaMock.nFT.findMany.mockResolvedValue([mockNft()]);
    prismaMock.nFT.count.mockResolvedValue(1);

    const res = await request(app).get('/api/v1/nfts').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.nfts).toHaveLength(1);
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('returns 404 for a missing NFT', async () => {
    prismaMock.nFT.findFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/nfts/missing').set(authHeader());

    expect(res.status).toBe(404);
  });

  it('offers an NFT transfer', async () => {
    prismaMock.nFT.findFirst.mockResolvedValue(mockNft());
    ethereumMock.offerNFTTransfer.mockResolvedValue('0xoffer');
    prismaMock.nFT.update.mockResolvedValue(mockNft({ isPendingTransfer: true }));
    prismaMock.transaction.create.mockResolvedValue({ id: 'tx-offer' });

    const res = await request(app)
      .post('/api/v1/nfts/nft-1/offer')
      .set(authHeader())
      .send({ recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' });

    expect(res.status).toBe(200);
    expect(res.body.data.txHash).toBe('0xoffer');
  });

  it('rejects offering an NFT to yourself', async () => {
    prismaMock.nFT.findFirst.mockResolvedValue(mockNft());

    const res = await request(app)
      .post('/api/v1/nfts/nft-1/offer')
      .set(authHeader())
      .send({ recipientAddress: TEST_USER.ethereumAddress });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot transfer NFT to yourself');
  });

  it('claims an offered NFT', async () => {
    const seller = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    prismaMock.nFT.findFirst.mockResolvedValue(
      mockNft({
        ethereumAddress: seller,
        isPendingTransfer: true,
        pendingTo: TEST_USER.ethereumAddress,
      })
    );
    ethereumMock.claimNFTTransfer.mockResolvedValue('0xclaim');
    prismaMock.nFT.update.mockResolvedValue(mockNft({ ethereumAddress: TEST_USER.ethereumAddress }));
    prismaMock.transaction.create.mockResolvedValue({ id: 'tx-claim' });

    const res = await request(app)
      .post('/api/v1/nfts/nft-1/claim')
      .set(authHeader())
      .send({ fromAddress: seller });

    expect(res.status).toBe(200);
    expect(res.body.data.txHash).toBe('0xclaim');
  });

  it('cancels a pending transfer', async () => {
    prismaMock.nFT.findFirst.mockResolvedValue(mockNft({ isPendingTransfer: true, pendingTo: '0xabc' }));
    ethereumMock.cancelNFTTransfer.mockResolvedValue('0xcancel');
    prismaMock.nFT.update.mockResolvedValue(mockNft());
    prismaMock.transaction.create.mockResolvedValue({ id: 'tx-cancel' });

    const res = await request(app).post('/api/v1/nfts/nft-1/cancel').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.txHash).toBe('0xcancel');
  });

  it('lists an NFT for sale', async () => {
    prismaMock.nFT.findFirst.mockResolvedValue(mockNft());
    ethereumMock.listNFT.mockResolvedValue('0xlist');
    prismaMock.nFT.update.mockResolvedValue(mockNft({ isListed: true }));

    const res = await request(app)
      .put('/api/v1/nfts/nft-1/list')
      .set(authHeader())
      .send({ isListed: true });

    expect(res.status).toBe(200);
    expect(ethereumMock.listNFT).toHaveBeenCalled();
  });

  it('purchases a listed NFT', async () => {
    const seller = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    prismaMock.nFT.findFirst.mockResolvedValue(
      mockNft({ ethereumAddress: seller, isListed: true, price: 50n })
    );
    ethereumMock.purchaseNFT.mockResolvedValue('0xbuy');
    prismaMock.nFT.update.mockResolvedValue(
      mockNft({ ethereumAddress: TEST_USER.ethereumAddress, isListed: false })
    );
    prismaMock.transaction.create.mockResolvedValue({ id: 'tx-buy' });

    const res = await request(app).post('/api/v1/nfts/nft-1/purchase').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.txHash).toBe('0xbuy');
    expect(ethereumMock.purchaseNFT).toHaveBeenCalledWith(TEST_USER.ethereumAddress, '0', 50n);
  });

  it('rejects purchasing your own NFT', async () => {
    prismaMock.nFT.findFirst.mockResolvedValue(mockNft({ isListed: true }));

    const res = await request(app).post('/api/v1/nfts/nft-1/purchase').set(authHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('You cannot purchase your own NFT');
  });
});
