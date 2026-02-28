const signIn = import.meta.env.VITE_REDIRECT_SIGN_IN || 'http://localhost:5173/app';
const signOut = import.meta.env.VITE_REDIRECT_SIGN_OUT || 'http://localhost:5173/';

// Provide both www and non-www variants so Amplify can match the current origin
function withWwwVariant(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost') return [url];
    const alt = new URL(url);
    alt.hostname = u.hostname.startsWith('www.')
      ? u.hostname.slice(4)
      : `www.${u.hostname}`;
    return [url, alt.toString()];
  } catch {
    return [url];
  }
}

export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID,
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: withWwwVariant(signIn),
          redirectSignOut: withWwwVariant(signOut),
          responseType: 'code',
        },
      },
    },
  },
};
