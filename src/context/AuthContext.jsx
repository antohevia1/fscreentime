import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('st_user');
    return saved ? JSON.parse(saved) : null;
  });

  const signIn = (email, password) => {
    const u = { email, alias: email.split('@')[0] };
    localStorage.setItem('st_user', JSON.stringify(u));
    setUser(u);
  };

  const signUp = (email, password, alias) => {
    const u = { email, alias };
    localStorage.setItem('st_user', JSON.stringify(u));
    setUser(u);
  };

  const signOut = () => {
    localStorage.removeItem('st_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
