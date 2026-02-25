import { createContext, useContext, useState, useEffect } from 'react';
import { signIn as amplifySignIn, signUp as amplifySignUp, signOut as amplifySignOut, getCurrentUser, fetchAuthSession, signInWithRedirect } from 'aws-amplify/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkUser(); }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const idTokenPayload = session.tokens?.idToken?.payload;
      const email =
        currentUser.signInDetails?.loginId ||
        idTokenPayload?.email ||
        currentUser.username;
      setUser({
        userId: currentUser.userId,
        identityId: session.identityId,
        email,
        alias: currentUser.username,
        token: session.tokens?.idToken?.toString(),
        credentials: session.credentials,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    const result = await amplifySignIn({ username: email, password });
    if (result.isSignedIn) await checkUser();
    return result;
  }

  async function signUp(email, password, alias) {
    return amplifySignUp({
      username: email,
      password,
      options: { userAttributes: { preferred_username: alias || email.split('@')[0] } },
    });
  }

  async function socialSignIn(provider) {
    await signInWithRedirect({ provider });
  }

  async function signOut() {
    await amplifySignOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, socialSignIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
