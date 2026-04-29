import React from "react";

import { EngineError } from "../api/client";
import { getStoredToken, setStoredToken, siteApi } from "../api/siteApi";

const AuthContext = React.createContext({
  token: "",
  site: null,
  assetRegister: null,
  authReady: false,
  authError: null,
  login: async () => {},
  logout: () => {},
  refreshAssetRegister: async () => {},
});

export function AuthProvider({ children }) {
  const [token, setTokenState] = React.useState(() => getStoredToken());
  const [site, setSite] = React.useState(null);
  const [assetRegister, setAssetRegister] = React.useState(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [authError, setAuthError] = React.useState(null);

  const logout = React.useCallback(() => {
    setStoredToken("");
    setTokenState("");
    setSite(null);
    setAssetRegister(null);
    setAuthError(null);
  }, []);

  const refreshAssetRegister = React.useCallback(async (explicitToken) => {
    const tok = explicitToken !== undefined ? explicitToken : token;
    if (!tok) {
      setAssetRegister(null);
      return;
    }
    const reg = await siteApi.getAssetRegister(tok);
    setAssetRegister(reg);
  }, [token]);

  const bootstrap = React.useCallback(async () => {
    const tok = getStoredToken();
    if (!tok) {
      setTokenState("");
      setSite(null);
      setAssetRegister(null);
      setAuthReady(true);
      return;
    }
    setTokenState(tok);
    try {
      const s = await siteApi.me(tok);
      setSite(s);
      setAuthError(null);
      await refreshAssetRegister(tok);
    } catch (err) {
      logout();
      if (err instanceof EngineError && err.kind === "http" && err.status === 401) {
        setAuthError(null);
      } else if (err instanceof EngineError) {
        setAuthError(err.message);
      } else {
        setAuthError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setAuthReady(true);
    }
  }, [logout, refreshAssetRegister]);

  React.useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = React.useCallback(
    async (username, password) => {
      setAuthError(null);
      const res = await siteApi.login(username, password);
      const { access_token: accessToken, site: sitePayload } = res;
      setStoredToken(accessToken);
      setTokenState(accessToken);
      setSite(sitePayload);
      await refreshAssetRegister(accessToken);
      return sitePayload;
    },
    [refreshAssetRegister]
  );

  const value = React.useMemo(
    () => ({
      token,
      site,
      assetRegister,
      authReady,
      authError,
      login,
      logout,
      refreshAssetRegister,
    }),
    [token, site, assetRegister, authReady, authError, login, logout, refreshAssetRegister]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
