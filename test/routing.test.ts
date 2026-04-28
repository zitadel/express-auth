import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import type express from 'express';
import type supertest from 'supertest';

import CredentialsProvider from '@auth/core/providers/credentials';
import type { AuthConfig } from '@auth/core';

const originalLib = await import('../src/lib/index.js');

jest.unstable_mockModule('../src/lib/index.js', () => {
  return {
    toWebRequest: jest.fn<typeof originalLib.toWebRequest>((req) => {
      if (req.headers['x-test-header'] === 'throw') {
        throw new Error('Test error');
      }
      return originalLib.toWebRequest(req);
    }),
    toExpressResponse: originalLib.toExpressResponse,
  };
});

const { ExpressAuth } = await import('../src/index.js');
const expressModule = await import('express');
const supertestModule = await import('supertest');

export const authConfig = {
  secret: 'secret',
  providers: [
    CredentialsProvider({
      credentials: { username: { label: 'Username' } },
      async authorize(credentials) {
        if (typeof credentials?.username === 'string') {
          const { username: name } = credentials;
          return { name: name, email: name.replace(' ', '') + '@example.com' };
        }
        return null;
      },
    }),
  ],
} satisfies AuthConfig;

describe('Middleware behaviour', () => {
  let app: express.Express;
  let client: ReturnType<typeof supertest>;
  let error: Error | null;

  beforeEach(() => {
    app = expressModule.default();
    client = supertestModule.default(app);

    error = null;

    app.use('/auth/*path', ExpressAuth(authConfig));
    app.get('/*path', (req, res) => {
      try {
        res.send('Hello World');
      } catch (err) {
        error = err as Error;
      }
    });
    app.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        next: express.NextFunction,
      ) => {
        error = err;
        res.status(500).send('Something broke!');
      },
    );
  });

  it('Should sent response only once', async () => {
    const response = await client
      .get('/auth/session')
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(error).toBe(null);
  });

  it('Should send status 500 if there is an error thrown in the auth middleware', async () => {
    const response = await client
      .get('/auth/session')
      .set('Accept', 'application/json')
      .set('X-Test-Header', 'throw');

    expect(response.status).toBe(500);
  });
});
