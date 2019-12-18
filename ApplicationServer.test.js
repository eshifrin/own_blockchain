const request = require('supertest');
const ApplicationServer = require('./ApplicationServer');

const bitcoin = require('bitcoinjs-lib');
const bitcoinMessage = require('bitcoinjs-message');

const makeKeysAndAddress = () => {
  const keyPair = bitcoin.ECPair.makeRandom();
  const address = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).address;
  return {
    keyPair,
    address
  };
};

const getUnixTime = () =>
  new Date()
    .getTime()
    .toString()
    .slice(0, -3);

describe('Integration tests', () => {
  const server = new ApplicationServer();
  const app = server.app;

  it('should have a genesis block', async () => {
    const res = await request(app)
      .get('/block/0')
      .send();

    expect(res.body.height).toEqual(0);
    expect(res.body.previousBlockHash).toEqual(null);
    expect(res.statusCode).toEqual(200);
  });

  it('should have no other blocks', async () => {
    const res = await request(app)
      .get('/block/1')
      .send();

    expect(res.statusCode).toEqual(404);
  });

  it('should respond to validation', async () => {
    const { address } = makeKeysAndAddress();
    const time = getUnixTime();

    const res = await request(app)
      .post('/requestValidation')
      .send({ address });
    expect(res.body).toEqual(`${address}:${time}:starRegistry`);
  });

  it('should successfully add a star', async () => {
    const { keyPair, address } = makeKeysAndAddress();

    const validation = await request(app)
      .post('/requestValidation')
      .send({ address });

    const message = validation.body;
    const signature = bitcoinMessage.sign(
      message,
      keyPair.privateKey,
      keyPair.compressed
    );

    const star = {
      dec: 'dec1',
      ra: 'ra1'
    };

    const res = await request(app)
      .post('/submitstar')
      .send({
        address,
        message,
        signature,
        star
      });

    expect(res.body.height).toEqual(1);
    expect(res.statusCode).toEqual(200);
  });

  it('should successfully show added stars', async () => {
    const { keyPair, address } = makeKeysAndAddress();

    const validation = await request(app)
      .post('/requestValidation')
      .send({ address });

    const message = validation.body;
    const signature = bitcoinMessage.sign(
      message,
      keyPair.privateKey,
      keyPair.compressed
    );

    const star = {
      dec: 'dec2',
      ra: 'ra2'
    };

    const res = await request(app)
      .post('/submitstar')
      .send({
        address,
        message,
        signature,
        star
      });

    const stars = await request(app)
      .get(`/blocks/${address}`)
      .send();

    expect(stars.body).toEqual([star]);
  });

  afterAll(() => {
    server.stop();
  });
});
