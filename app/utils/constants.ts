/** Default backend API base URL */
export const DEFAULT_API_BASE = 'https://options-scanner-backend-2exk6s.azurewebsites.net';

/** Resolved API base — uses NEXT_PUBLIC_API_BASE env var if set, otherwise the default */
export const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE || DEFAULT_API_BASE)
    : DEFAULT_API_BASE;
