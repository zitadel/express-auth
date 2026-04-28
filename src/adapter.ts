/**
 * Re-exports all adapter types from Auth.js core.
 *
 * This module provides access to database adapter interfaces and types
 * that can be used with Auth.js in Express applications. These adapters
 * enable persistent session storage and user management across various
 * database systems.
 *
 * @example
 * ```ts
 * import type { Adapter } from "@zitadel/express-auth/adapters"
 * import { MongoDBAdapter } from "@auth/mongodb-adapter"
 *
 * const adapter: Adapter = MongoDBAdapter(mongoClient)
 * ```
 */
export type * from '@auth/core/adapters';
