const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const axios = require("axios");

function setup({ refreshStatus = 200, persistenceFails = false } = {}) {
  const clients = [];
  let refreshCalls = 0;
  let logouts = 0;
  const exports = {};
  const axiosMock = {
    ...axios,
    create(options) {
      const client = axios.create(options);
      clients.push(client);
      return client;
    },
  };
  const source = ts.transpileModule(fs.readFileSync(require.resolve("../lib/api.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) => name === "axios" ? axiosMock : { API_BASE_URL: "http://test.invalid" },
  });
  const [api, publicApi] = clients;
  const reject = (config, status) => Promise.reject(new axios.AxiosError(
    "Request failed", "ERR_BAD_RESPONSE", config, undefined, { status, data: {}, config },
  ));
  api.defaults.adapter = (config) => config.headers.Authorization === "Bearer fresh"
    ? Promise.resolve({ status: 200, data: { success: true, data: [] }, config })
    : reject(config, 401);
  publicApi.defaults.adapter = async (config) => {
    refreshCalls++;
    if (refreshStatus === 0) throw new axios.AxiosError("Network Error", "ERR_NETWORK", config);
    if (refreshStatus !== 200) return reject(config, refreshStatus);
    return { status: 200, data: { success: true, data: { accessToken: "fresh" } }, config };
  };
  exports.configureApiAuthBridge({
    getAccessToken: () => "expired",
    getRefreshToken: () => "refresh",
    onAccessToken: async () => { if (persistenceFails) throw new Error("Session update unavailable"); },
    onUnauthorized: () => { logouts++; },
  });
  return { exports, calls: () => ({ refreshCalls, logouts }) };
}

test("parallel expired requests share refresh and retain fresh token despite stale React session", async () => {
  const env = setup();
  await Promise.all([env.exports.fetchSchools({}), env.exports.fetchTeachers({}), env.exports.fetchStudents({})]);
  await env.exports.fetchSchools({});
  assert.deepEqual(env.calls(), { refreshCalls: 1, logouts: 0 });
});

test("session persistence failure still retries using valid refreshed access token", async () => {
  const env = setup({ persistenceFails: true });
  await env.exports.fetchSchools({});
  assert.deepEqual(env.calls(), { refreshCalls: 1, logouts: 0 });
});

for (const refreshStatus of [0, 500, 502]) {
  test(`refresh failure ${refreshStatus} preserves session and can be retried`, async () => {
    const env = setup({ refreshStatus });
    await assert.rejects(env.exports.fetchSchools({}));
    await assert.rejects(env.exports.fetchSchools({}));
    assert.deepEqual(env.calls(), { refreshCalls: 2, logouts: 0 });
  });
}

test("explicit invalid refresh token rejection invokes logout", async () => {
  const env = setup({ refreshStatus: 401 });
  await assert.rejects(env.exports.fetchSchools({}));
  assert.deepEqual(env.calls(), { refreshCalls: 1, logouts: 1 });
});
