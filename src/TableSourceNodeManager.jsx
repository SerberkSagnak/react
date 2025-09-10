// Dosya Adı: TableSourceNodeManager.jsx

import React, { useState } from 'react';
import TableSourcePopup from './TableSourcePopup';
import { Button, Paper, Typography, Box } from '@mui/material';

const TableSourceNodeManager = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  const [tableSourceNodeData, setTableSourceNodeData] = useState({
    customName: 'Satış Verilerini Oku',
    connectionId: 'db_conn_1',
    schemaName: 'public',
    tableName: 'sales_2025'
  });

  const handleSave = (savedData) => {
    console.log("TableSource verisi kaydedildi:", savedData);
    setTableSourceNodeData(savedData);
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6">TableSource Node Yöneticisi</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Unit
      </Typography>

      <Button variant="contained" color="secondary" onClick={() => setIsPopupOpen(true)}>
       TableSource Configure
      </Button>

      <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2">Saved Items</Typography>
        <pre>{JSON.stringify(tableSourceNodeData, null, 2)}</pre>
      </Box>

      <TableSourcePopup
        open={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onSave={handleSave}
        initialData={tableSourceNodeData}
      />
    </Paper>
  );
};

export default TableSourceNodeManager;