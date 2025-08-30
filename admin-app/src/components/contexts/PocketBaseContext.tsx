import React, { createContext, useContext } from 'react';
import PocketBase from 'pocketbase';

// Настройка URL для PocketBase
// Для разработки используйте IP вашего компьютера вместо localhost
const PB_URL = 'http://192.168.1.100:8090'; // Замените на ваш IP

const pb = new PocketBase(PB_URL);

const PocketBaseContext = createContext<PocketBase | undefined>(undefined);

export const PocketBaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PocketBaseContext.Provider value={pb}>
      {children}
    </PocketBaseContext.Provider>
  );
};

export const usePocketBase = () => {
  const context = useContext(PocketBaseContext);
  if (!context) {
    throw new Error('usePocketBase must be used within a PocketBaseProvider');
  }
  return context;
};
