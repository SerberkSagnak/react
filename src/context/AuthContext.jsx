import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Sayfa yenilendiğinde durumu korumak için localStorage'a bak
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  useEffect(() => {
    // isAuthenticated durumu değiştiğinde localStorage'ı güncelle
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    // localStorage'dan da temizleyebiliriz, ama useEffect zaten hallediyor.
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Kendi hook'umuzu oluşturarak kullanımı kolaylaştırıyoruz
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
