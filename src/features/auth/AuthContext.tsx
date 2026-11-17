import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { EmployeeUser } from '../../types';
import { api, ApiError } from '../../services/api';

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'unavailable' | 'profile-pending';
export type AuthAction = 'activation' | 'recovery';

export interface PendingAuthAction {
  action: AuthAction;
  confirmed: boolean;
}

export class ProfileRetryPendingError extends Error {
  constructor(message: string, public action: AuthAction) {
    super(message);
    this.name = 'ProfileRetryPendingError';
  }
}

interface AuthContextType {
  user: EmployeeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  authMessage: string | null;
  pendingAction: PendingAuthAction | null;
  checkSession: () => Promise<void>;
  retryProfile: () => Promise<void>;
  activate: (nik: string, code: string) => Promise<void>;
  recover: (nik: string, recoveryCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<EmployeeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAuthAction | null>(null);

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    setAuthStatus('checking');
    setAuthMessage(null);
    try {
      const profile = await api.getMe();
      setUser(profile);
      setPendingAction(null);
      setAuthStatus('authenticated');
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        setUser(null);
        setPendingAction(null);
        setAuthStatus('unauthenticated');
        setAuthMessage(null);
      } else {
        setAuthStatus('unavailable');
        setAuthMessage(error instanceof Error ? error.message : 'Pemeriksaan sesi gagal. Coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void checkSession(); }, [checkSession]);

  const authMessageForAction = (action: AuthAction) => action === 'activation'
    ? 'Aktivasi telah dikonfirmasi backend, tetapi profile karyawan belum berhasil dimuat. Coba ulang pemeriksaan profile; jangan mengulang aktivasi.'
    : 'Pemulihan sesi telah dikonfirmasi backend, tetapi profile karyawan belum berhasil dimuat. Coba ulang pemeriksaan profile; jangan mengulang recovery.';

  const loadProfileAfterAction = async (action: AuthAction) => {
    setAuthStatus('profile-pending');
    setAuthMessage(authMessageForAction(action));
    setPendingAction({ action, confirmed: true });
    setUser(null);
    try {
      const profile = await api.getMe();
      setUser(profile);
      setPendingAction(null);
      setAuthMessage(null);
      setAuthStatus('authenticated');
    } catch (error) {
      if (error instanceof Error) setAuthMessage(authMessageForAction(action) + ' ' + error.message);
      throw new ProfileRetryPendingError(authMessageForAction(action), action);
    }
  };

  const markActionUncertain = (action: AuthAction, error: unknown) => {
    const message = action === 'activation'
      ? 'Request aktivasi telah dikirim, tetapi hasilnya belum dapat dipastikan. Periksa session; jangan mengirim ulang kode sebelum status perangkat dipastikan.'
      : 'Request recovery telah dikirim, tetapi hasilnya belum dapat dipastikan. Periksa session; jangan mengirim ulang kode sebelum status perangkat dipastikan.';
    setUser(null);
    setPendingAction({ action, confirmed: false });
    setAuthStatus('profile-pending');
    setAuthMessage(error instanceof Error ? message + ' ' + error.message : message);
    throw new ProfileRetryPendingError(message, action);
  };

  const isMutationResultUncertain = (error: unknown, invalidResponseCode: string) =>
    error instanceof ApiError &&
    (error.statusCode === 0 || error.statusCode >= 500 || error.code === invalidResponseCode);

  const activate = async (nik: string, code: string) => {
    setIsLoading(true);
    try {
      try {
        await api.activateDevice({ nik, code });
      } catch (error) {
        if (isMutationResultUncertain(error, 'INVALID_ACTIVATION_RESPONSE')) {
          markActionUncertain('activation', error);
        }
        throw error;
      }
      await loadProfileAfterAction('activation');
    } finally { setIsLoading(false); }
  };

  const recover = async (nik: string, recoveryCode: string) => {
    setIsLoading(true);
    try {
      try {
        await api.recoverSession({ nik, recoveryCode });
      } catch (error) {
        if (isMutationResultUncertain(error, 'INVALID_RECOVERY_RESPONSE')) {
          markActionUncertain('recovery', error);
        }
        throw error;
      }
      await loadProfileAfterAction('recovery');
    } finally { setIsLoading(false); }
  };

  const retryProfile = async () => {
    if (!pendingAction) {
      await checkSession();
      return;
    }
    setIsLoading(true);
    try {
      const profile = await api.getMe();
      setUser(profile);
      setPendingAction(null);
      setAuthMessage(null);
      setAuthStatus('authenticated');
    } catch (error) {
      setAuthMessage(authMessageForAction(pendingAction.action) + ' ' + (error instanceof Error ? error.message : ''));
      setAuthStatus('profile-pending');
      throw error;
    } finally { setIsLoading(false); }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: authStatus === 'authenticated' && !!user,
      authStatus,
      authMessage,
      pendingAction,
      checkSession,
      retryProfile,
      activate,
      recover,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
