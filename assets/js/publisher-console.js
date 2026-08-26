(function () {
  const DEFAULT_BASE_URL = "https://api.yuktinai.com";
  const STORAGE_KEYS = {
    baseUrl: "amos_publisher_base_url",
    email: "amos_publisher_email",
    token: "amos_publisher_token",
  };

  function byId(id) {
    return document.getElementById(id);
  }

  const elements = {
    baseUrl: byId("base-url"),
    email: byId("publisher-email"),
    otp: byId("publisher-otp"),
    authStatus: byId("publisher-auth-status"),
    configStatus: byId("publisher-config-status"),
    appSelect: byId("publisher-app-select"),
    configJson: byId("publisher-config-json"),
    configMode: byId("app-config-mode"),
    selfService: byId("app-self-service"),
    configSource: byId("app-config-source"),
    updatedBy: byId("app-config-updated-by"),
    requestOtpButton: byId("request-otp-button"),
    verifyOtpButton: byId("verify-otp-button"),
    logoutButton: byId("logout-button"),
    reloadAppsButton: byId("reload-apps-button"),
    saveConfigButton: byId("save-config-button"),
  };

  let apps = [];

  function status(target, message, isError) {
    target.textContent = message || "";
    target.style.color = isError ? "#ff9cb3" : "#9fd0ff";
  }

  function normalizeBaseUrl(value) {
    return String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  }

  function getToken() {
    return localStorage.getItem(STORAGE_KEYS.token) || "";
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.token, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.token);
    }
  }

  function buildHeaders(withAuth) {
    const headers = { "Content-Type": "application/json" };
    if (withAuth) {
      const token = getToken();
      if (token) {
        headers["x-publisher-token"] = token;
      }
    }
    return headers;
  }

  async function request(path, options) {
    const response = await fetch(`${normalizeBaseUrl(elements.baseUrl.value)}${path}`, options);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json.error || `Request failed (${response.status})`);
    }
    return json;
  }

  function setConfigMeta(payload) {
    elements.configMode.textContent = payload?.admobConfigMode || "-";
    elements.selfService.textContent = payload?.publisherSelfServiceEnabled ? "enabled" : "disabled";
    const firstGroup = Array.isArray(payload?.groups) && payload.groups.length > 0 ? payload.groups[0] : null;
    elements.configSource.textContent = firstGroup?.updatedSource || "-";
    elements.updatedBy.textContent = firstGroup?.updatedByEmail || "-";
  }

  function setConfigJson(config) {
    elements.configJson.value = JSON.stringify(
      config || { interstitialGroups: {}, bannerGroups: {}, rewardedGroups: {} },
      null,
      2
    );
  }

  function renderAppOptions(selectedAppId) {
    const options = ['<option value="">Select app</option>']
      .concat(
        apps.map((app) => {
          const selected = app.appId === selectedAppId ? " selected" : "";
          return `<option value="${app.appId}"${selected}>${app.name || app.appId} (${app.appId})</option>`;
        })
      )
      .join("");
    elements.appSelect.innerHTML = options;
  }

  async function loadApps(preferredAppId) {
    const json = await request("/publisher/apps", {
      method: "GET",
      headers: buildHeaders(true),
    });
    apps = json.apps || [];
    renderAppOptions(preferredAppId || apps[0]?.appId || "");
    if (elements.appSelect.value) {
      await loadSelectedConfig();
    }
  }

  async function loadSelectedConfig() {
    const appId = elements.appSelect.value;
    if (!appId) {
      setConfigMeta(null);
      setConfigJson(null);
      status(elements.configStatus, "Select an app to load its remote config.", false);
      return;
    }

    const json = await request(`/publisher/apps/${encodeURIComponent(appId)}/admob-config`, {
      method: "GET",
      headers: buildHeaders(true),
    });

    setConfigMeta(json.payload || null);
    setConfigJson(json.payload?.config || null);
    status(elements.configStatus, `Loaded config for ${appId}.`, false);
  }

  async function requestOtp() {
    localStorage.setItem(STORAGE_KEYS.baseUrl, normalizeBaseUrl(elements.baseUrl.value));
    localStorage.setItem(STORAGE_KEYS.email, String(elements.email.value || "").trim());
    const json = await request("/publisher/auth/request-otp", {
      method: "POST",
      headers: buildHeaders(false),
      body: JSON.stringify({
        email: String(elements.email.value || "").trim(),
      }),
    });
    status(elements.authStatus, `OTP sent via ${json.delivery || "email"} to ${json.email}.`, false);
  }

  async function verifyOtp() {
    const json = await request("/publisher/auth/verify-otp", {
      method: "POST",
      headers: buildHeaders(false),
      body: JSON.stringify({
        email: String(elements.email.value || "").trim(),
        otp: String(elements.otp.value || "").trim(),
      }),
    });
    setToken(json.token || "");
    status(elements.authStatus, `Signed in as ${json.publisher?.email || elements.email.value}.`, false);
    apps = json.apps || [];
    renderAppOptions(apps[0]?.appId || "");
    if (elements.appSelect.value) {
      await loadSelectedConfig();
    }
  }

  async function saveConfig() {
    const appId = elements.appSelect.value;
    if (!appId) {
      throw new Error("Select an app first.");
    }

    let parsedConfig;
    try {
      parsedConfig = JSON.parse(elements.configJson.value || "{}");
    } catch (_error) {
      throw new Error("AdMobConfig JSON is invalid.");
    }

    const json = await request(`/publisher/apps/${encodeURIComponent(appId)}/admob-config`, {
      method: "PUT",
      headers: buildHeaders(true),
      body: JSON.stringify({ config: parsedConfig }),
    });

    setConfigMeta(json.payload || null);
    setConfigJson(json.payload?.config || null);
    status(elements.configStatus, `Saved remote config for ${appId}.`, false);
  }

  async function logout() {
    const token = getToken();
    if (token) {
      try {
        await request("/publisher/auth/logout", {
          method: "POST",
          headers: buildHeaders(true),
        });
      } catch (_error) {
      }
    }
    setToken("");
    apps = [];
    renderAppOptions("");
    setConfigMeta(null);
    setConfigJson(null);
    status(elements.authStatus, "Signed out.", false);
    status(elements.configStatus, "", false);
  }

  function hydrate() {
    elements.baseUrl.value = localStorage.getItem(STORAGE_KEYS.baseUrl) || DEFAULT_BASE_URL;
    elements.email.value = localStorage.getItem(STORAGE_KEYS.email) || "";
    setConfigJson(null);
    renderAppOptions("");
    if (getToken()) {
      loadApps().then(() => {
        status(elements.authStatus, "Session restored.", false);
      }).catch((error) => {
        logout();
        status(elements.authStatus, error.message, true);
      });
    }
  }

  elements.requestOtpButton.addEventListener("click", () => {
    requestOtp().catch((error) => status(elements.authStatus, error.message, true));
  });
  elements.verifyOtpButton.addEventListener("click", () => {
    verifyOtp().catch((error) => status(elements.authStatus, error.message, true));
  });
  elements.logoutButton.addEventListener("click", () => {
    logout().catch((error) => status(elements.authStatus, error.message, true));
  });
  elements.reloadAppsButton.addEventListener("click", () => {
    loadApps(elements.appSelect.value).catch((error) => status(elements.configStatus, error.message, true));
  });
  elements.appSelect.addEventListener("change", () => {
    loadSelectedConfig().catch((error) => status(elements.configStatus, error.message, true));
  });
  elements.saveConfigButton.addEventListener("click", () => {
    saveConfig().catch((error) => status(elements.configStatus, error.message, true));
  });

  hydrate();
})();
