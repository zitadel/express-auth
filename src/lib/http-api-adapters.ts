import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import qs from 'qs';

type RequestBody = string | Buffer;

/**
 * Encodes an Express Request body based on the content type header
 * using the qs library for consistent URL encoding.
 */
function encodeRequestBody(req: ExpressRequest): RequestBody | undefined {
  const contentType = req.headers['content-type'];
  const method = req.method;

  let body: RequestBody | undefined;

  if (!/GET|HEAD/.test(method.toUpperCase())) {
    const rawBody = req.body;

    if (rawBody !== undefined && rawBody !== null) {
      if (contentType?.includes('application/x-www-form-urlencoded')) {
        body = qs.stringify(rawBody as Record<string, unknown>, {
          arrayFormat: 'repeat',
        });
      } else if (contentType?.includes('application/json')) {
        body = JSON.stringify(rawBody);
      } else if (typeof rawBody === 'string') {
        body = rawBody;
      } else if (Buffer.isBuffer(rawBody)) {
        body = rawBody;
      } else if (typeof rawBody === 'object') {
        body = qs.stringify(rawBody as Record<string, unknown>, {
          arrayFormat: 'repeat',
        });
      }
    }
  }

  return body;
}

/**
 * Converts an Express Request object to a Web API Request object.
 *
 * This adapter function handles the conversion between Express's request
 * format and the standard Web API Request interface used by Auth.js core.
 * It preserves headers, method, URL, and body content while ensuring
 * proper encoding based on content type using the qs library.
 *
 * @param req - The Express request object to convert
 * @returns A Web API Request object
 *
 * @example
 * ```ts
 * app.post('/api/auth/*', async (req, res) => {
 *   const webRequest = toWebRequest(req);
 *   const response = await Auth(webRequest, config);
 *   await toExpressResponse(response, res);
 * });
 * ```
 */
export function toWebRequest(req: ExpressRequest): Request {
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const headers = new Headers();

  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v) {
          headers.append(key, v);
        }
      });
    } else if (value) {
      headers.append(key, value);
    }
  });

  const rawBody = /GET|HEAD/.test(req.method)
    ? undefined
    : encodeRequestBody(req);

  const body =
    rawBody && Buffer.isBuffer(rawBody) ? new Uint8Array(rawBody) : rawBody;

  return new Request(url, {
    method: req.method,
    headers,
    body,
  });
}

/**
 * Converts a Web API Response object to an Express response.
 *
 * This adapter function handles the conversion from Auth.js core's Web API
 * Response format back to Express's response interface. It transfers headers,
 * status codes, and body content appropriately.
 *
 * @param response - The Web API Response object to convert
 * @param res - The Express response object to populate
 *
 * @example
 * ```ts
 * app.use('/api/auth/*', async (req, res) => {
 *   const webRequest = toWebRequest(req);
 *   const webResponse = await Auth(webRequest, config);
 *   await toExpressResponse(webResponse, res);
 * });
 * ```
 */
export async function toExpressResponse(
  response: Response,
  res: ExpressResponse,
): Promise<void> {
  response.headers.forEach((value, key) => {
    if (value) {
      res.append(key, value);
    }
  });

  res.writeHead(response.status, response.statusText, {
    'Content-Type': response.headers.get('content-type') || '',
  });

  res.write(await response.text());
  res.end();
}
