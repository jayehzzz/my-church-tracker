/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attendance from "../attendance.js";
import type * as evangelism from "../evangelism.js";
import type * as meetings from "../meetings.js";
import type * as migrations from "../migrations.js";
import type * as people from "../people.js";
import type * as seed from "../seed.js";
import type * as seed_simple from "../seed_simple.js";
import type * as services from "../services.js";
import type * as visitations from "../visitations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  attendance: typeof attendance;
  evangelism: typeof evangelism;
  meetings: typeof meetings;
  migrations: typeof migrations;
  people: typeof people;
  seed: typeof seed;
  seed_simple: typeof seed_simple;
  services: typeof services;
  visitations: typeof visitations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
