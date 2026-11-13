import { cleanup, handle } from './handler.js';

export default {
  fetch: (request, env) => handle(request, env),
  // Runs on the schedule in wrangler.toml.
  scheduled: (event, env, ctx) => { ctx.waitUntil(cleanup(env)); },
};
