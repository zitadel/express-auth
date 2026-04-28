# Express Auth.js

An [Express](https://expressjs.com/) integration for [Auth.js](https://authjs.dev/)
that provides seamless authentication with multiple providers, session
management, and route protection using Express middleware patterns.

This integration brings the power and flexibility of Auth.js to Express
applications with full TypeScript support and efficient HTTP handling.

### Why?

Modern web applications require robust, secure, and flexible authentication
systems. While Auth.js provides excellent authentication capabilities,
integrating it with Express applications requires careful handling of
request/response conversion and middleware composition.

However, a direct integration isn't always straightforward. Different types
of applications or deployment scenarios might warrant different approaches:

- **HTTP Request Handling:** Express uses its own request/response format
  which requires conversion to Web API standards used by Auth.js core.
  This integration handles that conversion transparently while maintaining
  proper encoding for different content types.
- **Middleware Composition:** Express's middleware pattern requires proper
  error handling and next() chaining. This integration composes body
  parsing and authentication into a single middleware that works correctly
  with Express's middleware pipeline.
- **Session Management:** Proper session handling requires integration with
  Express's request lifecycle. Manual integration often leads to
  inconsistent session management across different routes.

This integration, `@zitadel/express-auth`, aims to provide the flexibility to
handle such scenarios. It allows you to leverage the full Auth.js ecosystem
while maintaining Express best practices, ultimately leading to a more
effective and less burdensome authentication implementation.

## Installation

Install using NPM by using the following command:

```sh
npm install @zitadel/express-auth @auth/core
```

## Usage

To use this integration, add the `ExpressAuth` middleware to your Express
application. The middleware handles all Auth.js routes including sign-in,
sign-out, and callbacks.

You'll need to configure it with your Auth.js providers and options.

First, add the middleware to your Express app:

```typescript
import express from 'express';
import { ExpressAuth } from '@zitadel/express-auth';
import Zitadel from '@auth/core/providers/zitadel';

const app = express();
app.set('trust proxy', true);

app.use(
  '/auth/*',
  ExpressAuth({
    providers: [
      Zitadel({
        clientId: process.env.ZITADEL_CLIENT_ID,
        issuer: process.env.ZITADEL_ISSUER,
      }),
    ],
    secret: process.env.AUTH_SECRET,
    trustHost: true,
  }),
);
```

#### Using the Authentication System

The integration provides functions for handling authentication:

**Functions:**

- `ExpressAuth()`: Middleware that handles all Auth.js routes
- `getSession()`: Retrieves the current Auth.js session from requests

**Basic Usage:**

```typescript
import { getSession } from '@zitadel/express-auth';
import type { Session } from '@auth/core/types';

// Public route - no authentication needed
app.get('/api/public', (req, res) => {
  res.json({ message: 'Public endpoint' });
});

// Protected route - manual session check
app.get('/api/profile', async (req, res) => {
  const session = await getSession(req, authConfig);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({
    user: session.user,
    expires: session.expires,
  });
});
```

##### Example: Advanced Configuration with Multiple Providers

This example shows how to use the middleware with multiple Auth.js
providers and custom session configuration:

```typescript
import express from 'express';
import { ExpressAuth, getSession } from '@zitadel/express-auth';
import GoogleProvider from '@auth/core/providers/google';
import GitHubProvider from '@auth/core/providers/github';

const app = express();
app.set('trust proxy', true);

const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.roles = user.roles;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.roles = token.roles as string[];
      return session;
    },
  },
};

app.use('/auth/*', ExpressAuth(authConfig));

// Authentication middleware
async function requireAuth(req, res, next) {
  const session = await getSession(req, authConfig);
  if (!session?.user) {
    return res.redirect('/auth/signin?error=SessionRequired');
  }
  req.session = session;
  next();
}

// Protected routes
app.get('/api/user', requireAuth, (req, res) => {
  res.json(req.session.user);
});
```

## Known Issues

- **Body Parsing:** The middleware automatically applies JSON and
  URL-encoded body parsing. If you need custom body parsing, ensure
  it is configured before the Auth.js middleware.
- **Session Storage Configuration:** The integration relies on Auth.js
  session handling mechanisms. When configuring custom session storage or
  database adapters, ensure they are properly configured in the Auth.js
  options passed to the middleware.

## Useful links

- **[Auth.js](https://authjs.dev/):** The authentication library that this
  integration is built upon.
- **[Express](https://expressjs.com/):** The Node.js framework this
  integration is designed for.
- **[Auth.js Providers](https://authjs.dev/getting-started/providers):**
  Complete list of supported authentication providers.

## Contributing

If you have suggestions for how this integration could be improved, or
want to report a bug, open an issue - we'd love all and any
contributions.

## License

Apache-2.0
