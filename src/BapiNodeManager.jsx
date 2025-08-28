// Dosya Adı: BapiNodeManager.jsx

import React, { useState } from 'react';
import BapiPopup from './BapiPopup';
import { Button, Paper, Typography, Box } from '@mui/material';

const BapiNodeManager = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  const [bapiNodeData, setBapiNodeData] = useState({
    customName: 'Müşteri Detayı Getir',
    connectionId: 'sap_conn_2',
    functionName: 'BAPI_USER_GET_DETAIL'
  });

  const handleSave = (savedData) => {
    console.log("BAPI verisi kaydedildi:", savedData);
    setBapiNodeData(savedData);
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6">BAPI Node Yöneticisi</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Bu bölüm BAPI düğümünü ve onun yapılandırmasını yönetir.
      </Typography>

      <Button variant="contained" onClick={() => setIsPopupOpen(true)}>
        BAPI Düğümünü Yapılandır
      </Button>
      
      <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2">Mevcut Kayıtlı Veri:</Typography>
        <pre>{JSON.stringify(bapiNodeData, null, 2)}</pre>
      </Box>

      <BapiPopup
        open={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onSave={handleSave}
        initialData={bapiNodeData}
      />
    </Paper>
  );
};

export default BapiNodeManager;