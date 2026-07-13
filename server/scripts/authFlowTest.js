const crypto = require("crypto");
const mongoose = require("mongoose");
const env = require("../src/config/env");
const User = require("../src/models/User");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";

const createCookieJar = () => {
  const jar = new Map();

  const setCookies = (setCookieHeaders = []) => {
    setCookieHeaders.forEach((cookieLine) => {
      const [pair] = cookieLine.split(";");
      const [name, value] = pair.split("=");
      if (name) {
        jar.set(name.trim(), (value || "").trim());
      }
    });
  };

  const header = () => {
    if (jar.size === 0) {
      return "";
    }
    return Array.from(jar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  };

  return { setCookies, header };
};

const getSetCookieHeaders = (headers) => {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const raw = headers.get("set-cookie");
  if (!raw) {
    return [];
  }

  return raw.split(/,(?=[^;]+=[^;]+)/);
};

const requestJson = async (url, options = {}, jar) => {
  const headers = {
    ...(options.headers || {}),
  };

  if (jar) {
    const cookieHeader = jar.header();
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (jar) {
    jar.setCookies(getSetCookieHeaders(response.headers));
  }

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    json = { raw: text };
  }

  return { response, json };
};

const getCsrfToken = async (jar) => {
  const { json } = await requestJson(`${BASE_URL}/api/csrf-token`, {}, jar);
  return json?.data?.csrfToken;
};

const test = async () => {
  const jar = createCookieJar();
  const results = [];

  const record = (name, ok, detail) => {
    results.push({
      test: name,
      status: ok ? "PASS" : "FAIL",
      detail: detail || "",
    });
  };

  const email = `test+${crypto.randomBytes(6).toString("hex")}@example.com`;
  const password = "Test@1234";
  const newPassword = "New@1234";
  const resetPassword = "Reset@1234";

  try {
    const health = await requestJson(`${BASE_URL}/api/health`);
    record("health", health.json?.status === "success", health.json?.message);

    const csrfToken = await getCsrfToken(jar);
    const register = await requestJson(
      `${BASE_URL}/api/auth/register`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          name: "Test User",
          email,
          password,
        }),
      },
      jar
    );
    record(
      "register",
      register.json?.status === "success",
      register.json?.message
    );

    const csrfLogin1 = await getCsrfToken(jar);
    const loginBefore = await requestJson(
      `${BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfLogin1,
        },
        body: JSON.stringify({ email, password }),
      },
      jar
    );
    record(
      "login before verify",
      loginBefore.response.status === 401 &&
        loginBefore.json?.message === "Invalid email or password",
      loginBefore.json?.message
    );

    await mongoose.connect(env.mongoUri);
    const user = await User.findOne({ email });
    if (!user) {
      record("verify email", false, "User not found in DB");
      return;
    }

    const verifyToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verify = await requestJson(
      `${BASE_URL}/api/auth/verify-email?token=${verifyToken}`,
      { method: "GET", headers: { "accept": "application/json" } },
      jar
    );
    record(
      "verify email",
      verify.json?.status === "success",
      verify.json?.message
    );

    const csrfLogin2 = await getCsrfToken(jar);
    const login = await requestJson(
      `${BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfLogin2,
        },
        body: JSON.stringify({ email, password }),
      },
      jar
    );
    record("login", login.json?.status === "success", login.json?.message);

    const csrfRefresh = await getCsrfToken(jar);
    const refresh = await requestJson(
      `${BASE_URL}/api/auth/refresh-token`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfRefresh,
        },
        body: "{}",
      },
      jar
    );
    record(
      "refresh token",
      refresh.json?.status === "success",
      refresh.json?.message
    );

    const csrfChange = await getCsrfToken(jar);
    const change = await requestJson(
      `${BASE_URL}/api/auth/change-password`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfChange,
        },
        body: JSON.stringify({
          currentPassword: password,
          newPassword,
        }),
      },
      jar
    );
    record(
      "change password",
      change.json?.status === "success",
      change.json?.message
    );

    const csrfForgot = await getCsrfToken(jar);
    const forgot = await requestJson(
      `${BASE_URL}/api/auth/forgot-password`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfForgot,
        },
        body: JSON.stringify({ email }),
      },
      jar
    );
    record(
      "forgot password",
      forgot.json?.status === "success",
      forgot.json?.message
    );

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const csrfReset = await getCsrfToken(jar);
    const reset = await requestJson(
      `${BASE_URL}/api/auth/reset-password?token=${resetToken}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfReset,
        },
        body: JSON.stringify({ password: resetPassword }),
      },
      jar
    );
    record(
      "reset password",
      reset.json?.status === "success",
      reset.json?.message
    );

    const csrfLogin3 = await getCsrfToken(jar);
    const loginAfterReset = await requestJson(
      `${BASE_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfLogin3,
        },
        body: JSON.stringify({ email, password: resetPassword }),
      },
      jar
    );
    record(
      "login after reset",
      loginAfterReset.json?.status === "success",
      loginAfterReset.json?.message
    );

    const me = await requestJson(
      `${BASE_URL}/api/auth/me`,
      { method: "GET" },
      jar
    );
    record("me", me.json?.status === "success", me.json?.message);

    const csrfLogout = await getCsrfToken(jar);
    const logout = await requestJson(
      `${BASE_URL}/api/auth/logout`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfLogout,
        },
        body: "{}",
      },
      jar
    );
    record("logout", logout.json?.status === "success", logout.json?.message);

    await User.deleteOne({ email });
  } catch (error) {
    record("unexpected error", false, error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }

  const failed = results.filter((item) => item.status !== "PASS");
  console.table(results);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

test();
