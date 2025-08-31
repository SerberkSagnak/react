import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // State'i artık boolean değil, token'ın kendisini tutacak şekilde değiştiriyoruz.
  const [token, setToken] = useState(() => {
    // Sayfa yenilendiğinde token'ı localStorage'dan oku
    return localStorage.getItem('authToken');
  });

  // login fonksiyonu artık sunucudan gelen yeni token'ı parametre olarak alıyor
  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem('authToken', newToken);
  };

  // logout fonksiyonu hem state'i hem de localStorage'ı temizliyor
  const logout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
  };

  // isAuthenticated durumunu token'ın var olup olmamasına göre anlık olarak hesaplıyoruz
  const isAuthenticated = !!token;

  // Context'in diğer bileşenlere sunduğu değere 'token'ı da ekliyoruz
  const value = { token, isAuthenticated, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth hook'unda bir değişiklik yok, aynı şekilde çalışmaya devam edecek
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};