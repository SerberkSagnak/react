// Dosya Adı: TableSourcePopup.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Box, Typography, Divider,
  IconButton, CircularProgress, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// --- VERİTABANI BAĞLANTILARI SİMÜLASYONU ---
// Bu, TableSource için kullanılacak sahte veridir.
const MOCK_DB_CONNECTIONS = [
  { 
    id: 'db_conn_1', 
    name: 'Production PostgreSQL DB', 
    fields: [
      { name: 'host', label: 'Host', type: 'text', defaultValue: 'prod.db.internal', disabled: true },
      { name: 'database', label: 'Database Name', type: 'text', defaultValue: 'analytics_db', disabled: true },
      { name: 'schemaName', label: 'Schema Name', type: 'text', placeholder: 'public' },
      { name: 'tableName', label: 'Table Name', type: 'text', placeholder: 'sales_data' }
    ]
  },
  { 
    id: 'db_conn_2', 
    name: 'Data Warehouse (BigQuery)', 
    fields: [
      { name: 'projectId', label: 'Project ID', type: 'text', defaultValue: 'gcp-project-123', disabled: true },
      { name: 'datasetId', label: 'Dataset ID', type: 'text', placeholder: 'marketing_reports' },
      { name: 'tableName', label: 'Table Name', type: 'text', placeholder: 'customer_acquisitions_2025' }
    ]
  }
];
// ---------------------------------


const TableSourcePopup = ({ open, onClose, onSave, initialData = {} }) => {
  
  const [formData, setFormData] = useState(initialData);
  const [dbConnections, setDbConnections] = useState([]);
  const [configFields, setConfigFields] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData(initialData);
  }, [initialData, open]);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setDbConnections(MOCK_DB_CONNECTIONS);
      setIsLoading(false);
    }, 500); // Daha hızlı yükleme simülasyonu
  }, []);

  useEffect(() => {
    if (formData.connectionId) {
      const selected = dbConnections.find(s => s.id === formData.connectionId);
      setConfigFields(selected ? selected.fields : []);
    } else {
      setConfigFields([]);
    }
  }, [formData.connectionId, dbConnections]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const renderDynamicFields = () => {
    if (!formData.connectionId) {
      return <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>Özellikleri görmek için bir veritabanı bağlantısı seçin.</Typography>;
    }
    
    return configFields.map(field => (
      <TextField
        key={field.name}
        fullWidth
        margin="dense"
        name={field.name}
        label={field.label}
        type={field.type || 'text'}
        value={formData[field.name] || field.defaultValue || ''}
        onChange={handleChange}
        placeholder={field.placeholder || ''}
        disabled={field.disabled || false}
        variant={field.disabled ? 'filled' : 'outlined'}
      />
    ));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Tablo Kaynağını Yapılandır
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography gutterBottom>
          Bu kaynak için bir isim ve kullanılacak veritabanı ile tablo bilgilerini belirtin.
        </Typography>

        <TextField
          autoFocus
          margin="dense"
          name="customName"
          label="Düğüm Adı (Opsiyonel)"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.customName || ''}
          onChange={handleChange}
        />

        <FormControl fullWidth margin="normal" disabled={isLoading}>
          <InputLabel id="db-connection-label">Veritabanı Bağlantısı</InputLabel>
          <Select
            labelId="db-connection-label"
            name="connectionId"
            value={formData.connectionId || ''}
            label="Veritabanı Bağlantısı"
            onChange={handleChange}
          >
            <MenuItem value=""><em>Seçilmedi</em></MenuItem>
            {dbConnections.map((conn) => (
              <MenuItem key={conn.id} value={conn.id}>{conn.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ minHeight: 150 }}>
          <Typography variant="h6" gutterBottom>Kaynak Özellikleri</Typography>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            renderDynamicFields()
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave} variant="contained" disabled={!formData.connectionId}>
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TableSourcePopup;