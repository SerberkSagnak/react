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
  // ...
  const [sources, setSources] = useState([
    // --- 1. BAĞLANTI İÇİN TANIMLAMALAR ---
    { 
      id: 'sap_conn_1', 
      type: 'sap', 
      name: 'SAP ERP Production', 
      // BU BAĞLANTIYA ÖZEL GÖSTERİLECEK ALANLAR
      fields: [
        { name: 'host', label: 'Host', type: 'text', defaultValue: '192.168.1.100', disabled: true },
        { name: 'client', label: 'Client', type: 'text', defaultValue: '800', disabled: true },
        { name: 'functionName', label: 'BAPI Function Name', type: 'text', placeholder: 'Örn: BAPI_SALESORDER_CREATE' }
      ]
    },
    // --- 2. BAĞLANTI İÇİN TANIMLAMALAR ---
    { 
      id: 'sap_conn_2', 
      type: 'sap', 
      name: 'SAP Test System', 
      // BU BAĞLANTIYA ÖZEL, BİRAZ DAHA FARKLI ALANLAR
      fields: [
        { name: 'host', label: 'Host', type: 'text', defaultValue: '10.0.0.5', disabled: true },
        { name: 'client', label: 'Client', type: 'text', defaultValue: '300', disabled: true },
        { name: 'functionName', label: 'Function Name', type: 'text', placeholder: 'Örn: BAPI_USER_GET_DETAIL' },
        { name: 'username', label: 'Test User (Optional)', type: 'text', placeholder: 'TESTUSER' }
      ]
    },
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