import { create } from 'zustand';
import api from '../services/api';
import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem('user') || 'null'),
  token:   localStorage.getItem('token') || null,
  loading: false,
  error:   null,

  // ── Password login (Admin / Operator) ──────────────────────────────────────
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, token } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, loading: false });
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.error || 'Ошибка входа';
      set({ loading: false, error });
      return { success: false, error };
    }
  },

  // ── PIN login (Seller fallback) ────────────────────────────────────────────
  loginWithPin: async (email, pin) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login/pin', { email, pin });
      const { user, token } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, loading: false });
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.error || 'Неверный PIN';
      set({ loading: false, error });
      return { success: false, error };
    }
  },

  // ── Face ID / WebAuthn login (Seller) ─────────────────────────────────────
  loginWithFaceId: async (email) => {
    set({ loading: true, error: null });
    try {
      // 1. Get challenge from server
      const challengeRes = await api.post('/auth/webauthn/auth/start', { email });
      const options = challengeRes.data;

      // 2. Trigger browser biometric prompt
      const authResponse = await startAuthentication(options);

      // 3. Verify with server
      const verifyRes = await api.post('/auth/webauthn/auth/finish', { email, response: authResponse,});

      const { user, token } = verifyRes.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, loading: false });
      return { success: true };
    } catch (err) {
      // WebAuthn errors have specific messages
      let error = 'Face ID не работает';
      if (err?.name === 'NotAllowedError') error = 'Доступ к биометрии отклонён';
      else if (err?.name === 'SecurityError') error = 'Ошибка безопасности WebAuthn';
      else if (err?.response?.data?.error) error = err.response.data.error;
      set({ loading: false, error });
      return { success: false, error };
    }
  },

  // ── WebAuthn registration (Seller registers their device) ─────────────────
  registerFaceId: async (credentialName) => {
    set({ loading: true, error: null });
    try {
      const optRes = await api.post('/auth/webauthn/register/start');
      const registrationResponse = await startRegistration(optRes.data);
      const result = await api.post('/auth/webauthn/register/finish', {
      response: registrationResponse,
      name: credentialName,
    });
      // Update local user
      const updatedUser = { ...get().user, faceAuthEnabled: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser, loading: false });
      return { success: true, data: result.data };
    } catch (err) {
      let error = 'Ошибка регистрации Face ID';
      if (err?.name === 'NotAllowedError') error = 'Регистрация отменена пользователем';
      else if (err?.response?.data?.error) error = err.response.data.error;
      set({ loading: false, error });
      return { success: false, error };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, error: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
