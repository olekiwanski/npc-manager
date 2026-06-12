/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  reporters: ["html", "progress"],
  mutate: [], // always supply --mutate on the CLI; bare "npx stryker run" is a no-op
};
