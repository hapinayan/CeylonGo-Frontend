export const environment = {
  production: true,
  apiBaseUrl:
    (globalThis as { __CEYLONGO_API_BASE_URL__?: string })?.__CEYLONGO_API_BASE_URL__ ??
    'http://127.0.0.1:8000/api/v1',
  googleClientId: '120484982691-3kmaj0g4rucnodqhgaaf6obvnsk0gseu.apps.googleusercontent.com',
  features: {
    tourGuidesApiMode: 'live' as 'mock' | 'live',
    adminPreviewMode: false,
  },
};
