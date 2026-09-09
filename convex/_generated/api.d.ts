/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as attendance from "../attendance.js";
import type * as churchImport from "../churchImport.js";
import type * as churchSettings from "../churchSettings.js";
import type * as crm from "../crm.js";
import type * as crons from "../crons.js";
import type * as evangelism from "../evangelism.js";
import type * as follow_ups from "../follow_ups.js";
import type * as lib_attendanceWorkflow from "../lib/attendanceWorkflow.js";
import type * as lib_careWorkflow from "../lib/careWorkflow.js";
import type * as lib_contactPolicy from "../lib/contactPolicy.js";
import type * as lib_maintenance from "../lib/maintenance.js";
import type * as lib_security from "../lib/security.js";
import type * as maintenance from "../maintenance.js";
import type * as meetingPrograms from "../meetingPrograms.js";
import type * as meetings from "../meetings.js";
import type * as memories from "../memories.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as people from "../people.js";
import type * as peopleValidation from "../peopleValidation.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as seed_simple from "../seed_simple.js";
import type * as servicePhotos from "../servicePhotos.js";
import type * as services from "../services.js";
import type * as visitations from "../visitations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  attendance: typeof attendance;
  churchImport: typeof churchImport;
  churchSettings: typeof churchSettings;
  crm: typeof crm;
  crons: typeof crons;
  evangelism: typeof evangelism;
  follow_ups: typeof follow_ups;
  "lib/attendanceWorkflow": typeof lib_attendanceWorkflow;
  "lib/careWorkflow": typeof lib_careWorkflow;
  "lib/contactPolicy": typeof lib_contactPolicy;
  "lib/maintenance": typeof lib_maintenance;
  "lib/security": typeof lib_security;
  maintenance: typeof maintenance;
  meetingPrograms: typeof meetingPrograms;
  meetings: typeof meetings;
  memories: typeof memories;
  migrations: typeof migrations;
  notifications: typeof notifications;
  people: typeof people;
  peopleValidation: typeof peopleValidation;
  search: typeof search;
  seed: typeof seed;
  seed_simple: typeof seed_simple;
  servicePhotos: typeof servicePhotos;
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
