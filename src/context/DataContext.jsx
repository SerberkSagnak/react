import { createContext, useState, useContext } from 'react';

// 1. Context objesini oluşturuyoruz
const DataContext = createContext();

// 2. Diğer bileşenlerin bu context'e kolayca erişmesini sağlayan bir custom hook
// Bu, her seferinde useContext(DataContext) yazmak yerine useData() yazmamızı sağlar.
export const useData = () => {
  return useContext(DataContext);
};

// 3. Uygulamayı sarmalayacak olan ve veriyi "sağlayan" Provider bileşeni
export const DataProvider = ({ children }) => {
  // Uygulama genelinde paylaşılacak olan state'ler
  const [sources, setSources] = useState([
    // Başlangıç için sahte bir SAP bağlantı verisi ekleyelim.
    // Bu, "Sources" ekranını yapana kadar BAPI pop-up'ının çalışmasını sağlar.
    { id: 'sap_conn_1', type: 'sap', name: 'SAP ERP Production', host: '192.168.1.100', client: '800' },
    { id: 'sap_conn_2', type: 'sap', name: 'SAP Test System', host: '10.0.0.5', client: '300' },
  ]);
  
  const [destinations, setDestinations] = useState([]);

  // Gelecekte "Sources" ekranından yeni kaynak eklemek için kullanacağımız fonksiyon
  const addSource = (source) => {
    setSources(prevSources => [...prevSources, { ...source, id: `source_${Date.now()}` }]);
  };

  // Gelecekte "Destinations" ekranından yeni hedef eklemek için kullanacağımız fonksiyon
  const addDestination = (destination) => {
    setDestinations(prevDestinations => [...prevDestinations, { ...destination, id: `dest_${Date.now()}` }]);
  };
  
  // Paylaşılacak olan tüm değerler ve fonksiyonları bir obje içinde topluyoruz
  const value = {
    sources,
    destinations,
    addSource,
    addDestination,
  };

  // Bu Provider'ın altındaki tüm bileşenler, "value" prop'undaki verilere erişebilir.
  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};