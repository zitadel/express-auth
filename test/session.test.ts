import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import type express from 'express';
import type supertest from 'supertest';

const sessionJson = {
  user: {
    name: 'John Doe',
    email: 'test@example.com',
    image: '',
    id: '1234',
  },
  expires: '',
};

jest.unstable_mockModule('@auth/core', () => {
  return {
    Auth: jest.fn(() => {
      return new Response(JSON.stringify(sessionJson), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
    setEnvDefaults: jest.fn(),
    createActionURL: jest.fn(
      () => new URL('http://localhost:3000/auth/session'),
    ),
    customFetch: undefined,
  };
});

const { getSession } = await import('../src/index.js');
const expressModule = await import('express');
const supertestModule = await import('supertest');

describe('getSession', () => {
  let app: express.Express;
  let client: ReturnType<typeof supertest>;

  beforeEach(() => {
    app = expressModule.default();
    client = supertestModule.default(app);
  });

  it('Should return the mocked session from the Auth response', async () => {
    let expectations: () => void | Promise<void> = () => {};

    app.post('/', async (req, res) => {
      const session = await getSession(req, {
        providers: [],
        secret: 'secret',
      });

      expectations = async () => {
        expect(session).toEqual(sessionJson);
      };

      res.send('OK');
    });

    await client
      .post('/')
      .set('X-Test-Header', 'foo')
      .set('Accept', 'application/json');

    await expectations();
  });
});
