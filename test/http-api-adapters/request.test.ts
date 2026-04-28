import { describe, beforeEach, it, expect } from '@jest/globals';
import { toWebRequest } from '../../src/lib/index.js';
import type { Request as ExpressRequest } from 'express';
import supertest from 'supertest';
import express from 'express';
import qs from 'qs';

function expectMatchingRequestHeaders(req: ExpressRequest, request: Request) {
  for (const headerName in req.headers) {
    expect(request.headers.get(headerName)).toEqual(req.headers[headerName]);
  }
}

async function expectMatchingJsonRequestBody(
  req: ExpressRequest,
  request: Request,
) {
  const body = await request.json();
  expect(body).toEqual(req.body);
}

async function expectMatchingUrlEncodedRequestBody(
  req: ExpressRequest,
  request: Request,
) {
  const body = await request.text();
  expect(body).toEqual(
    qs.stringify(req.body as Record<string, unknown>, {
      arrayFormat: 'repeat',
    }),
  );
}

describe('toWebRequest', () => {
  let app: express.Express;
  let client: ReturnType<typeof supertest>;

  beforeEach(() => {
    app = express();
    client = supertest(app);
  });

  it('adapts request headers', async () => {
    let expectations: () => void | Promise<void> = () => {};

    app.use(express.json());

    app.post('/', async (req, res) => {
      const request = toWebRequest(req);

      expectations = async () => {
        expectMatchingRequestHeaders(req, request);
      };

      res.send('OK');
    });

    await client
      .post('/')
      .set('X-Test-Header', 'foo')
      .set('Accept', 'application/json');

    await expectations();
  });

  it('adapts request with json encoded body', async () => {
    let expectations: () => void | Promise<void> = () => {};

    app.use(express.json());

    app.post('/', async (req, res) => {
      const request = toWebRequest(req);

      expectations = async () => {
        await expectMatchingJsonRequestBody(req, request);
      };

      res.send('OK');
    });

    const data = {
      name: 'Rexford',
    };

    await client.post('/').set('Content-Type', 'application/json').send(data);

    await expectations();
  });

  it('adapts request with url-encoded body', async () => {
    let expectations: () => void | Promise<void> = () => {};

    app.use(express.urlencoded());

    app.post('/', async (req, res) => {
      const request = toWebRequest(req);

      expectations = async () => {
        await expectMatchingUrlEncodedRequestBody(req, request);
      };

      res.send('OK');
    });

    const data = {
      name: 'Rexford',
      nums: [1, 2, 3],
    };

    await client
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(
        qs.stringify(data, {
          arrayFormat: 'repeat',
        }),
      );

    await expectations();
  });
});
