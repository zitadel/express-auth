import {
  Auth,
  type AuthConfig,
  setEnvDefaults,
  createActionURL,
  customFetch,
} from '@auth/core';
import type { Session } from '@auth/core/types';
import * as e from 'express';
import { toWebRequest, toExpressResponse } from './lib/index.js';

export { customFetch };
export { AuthError, CredentialsSignin } from '@auth/core/errors';
export type {
  Account,
  DefaultSession,
  Profile,
  Session,
  User,
} from '@auth/core/types';

export type ExpressAuthConfig = Omit<AuthConfig, 'raw'>;

/**
 * Creates an Express middleware that handles Auth.js authentication routes.
 *
 * This middleware should be mounted on a catch-all route (e.g. `/auth/*`)
 * and handles all Auth.js routes including sign-in, sign-out, and callbacks.
 *
 * @param config - The Auth.js configuration object
 * @returns An Express middleware function
 *
 * @example
 * ```ts
 * import { ExpressAuth } from '@zitadel/express-auth';
 * import Zitadel from '@auth/core/providers/zitadel';
 *
 * const app = express();
 * app.set('trust proxy', true);
 * app.use('/auth/*', ExpressAuth({ providers: [Zitadel] }));
 * ```
 */
export function ExpressAuth(config: ExpressAuthConfig) {
  return async (req: e.Request, res: e.Response, next: e.NextFunction) => {
    e.json()(req, res, async (err) => {
      if (err) return next(err);
      e.urlencoded({ extended: true })(req, res, async (err) => {
        if (err) return next(err);
        try {
          config.basePath = getBasePath(req);
          setEnvDefaults(process.env, config);
          await toExpressResponse(await Auth(toWebRequest(req), config), res);
          if (!res.headersSent) next();
        } catch (error) {
          next(error);
        }
      });
    });
  };
}

export type GetSessionResult = Promise<Session | null>;

/**
 * Retrieves the current session from the request.
 *
 * @param req - The Express request object
 * @param config - The Auth.js configuration object
 * @returns The session object, or null if no session exists
 *
 * @example
 * ```ts
 * import { getSession } from '@zitadel/express-auth';
 *
 * app.get('/profile', async (req, res) => {
 *   const session = await getSession(req, authConfig);
 *   if (!session) return res.redirect('/auth/signin');
 *   res.json({ user: session.user });
 * });
 * ```
 */
export async function getSession(
  req: e.Request,
  config: ExpressAuthConfig,
): GetSessionResult {
  setEnvDefaults(process.env, config);
  const url = createActionURL(
    'session',
    req.protocol,
    // @ts-expect-error Express headers are compatible with Headers constructor
    new Headers(req.headers),
    process.env,
    config,
  );

  const response = await Auth(
    new Request(url, { headers: { cookie: req.headers.cookie ?? '' } }),
    config,
  );

  const { status = 200 } = response;

  const data = await response.json();

  if (!data || !Object.keys(data).length) return null;
  if (status === 200) return data;
  throw new Error(data.message);
}

function getBasePath(req: e.Request) {
  // Support both Express 4 (req.params[0]) and Express 5 (named wildcard params)
  const rawWildcard = req.params[0] ?? Object.values(req.params)[0] ?? '';
  // Express 5 returns array for wildcard params (e.g. ["callback", "credentials"])
  const wildcard = Array.isArray(rawWildcard)
    ? rawWildcard.join('/')
    : rawWildcard;
  return req.baseUrl.split(wildcard)[0].replace(/\/$/, '');
}
