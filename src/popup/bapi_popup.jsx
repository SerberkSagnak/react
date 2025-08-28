import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Box, Typography, Divider,
  IconButton, CircularProgress, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// --- VERİTABANI SİMÜLASYONU ---
// Bu sahte veri, backend'iniz hazır olana kadar arayüzü test etmenizi sağlar.
// Backend'den gelecek olan veri bu yapıda olmalıdır.
const MOCK_SOURCES = [
  { 
    id: 'sap_conn_1', 
    name: 'SAP Üretim Sunucusu (PROD)', 
    fields: [
      { name: 'host', label: 'Host', type: 'text', defaultValue: '192.168.1.100', disabled: true },
      { name: 'client', label: 'Client', type: 'text', defaultValue: '800', disabled: true },
      { name: 'functionName', label: 'BAPI Function Name', type: 'text', placeholder: 'Örn: BAPI_SALESORDER_CREATE' }
    ]
  },
  { 
    id: 'sap_conn_2', 
    name: 'SAP Test Sunucusu (TEST)', 
    fields: [
      { name: 'host', label: 'Host', type: 'text', defaultValue: '10.0.0.5', disabled: true },
      { name: 'client', label: 'Client', type: 'text', defaultValue: '300', disabled: true },
      { name: 'functionName', label: 'Function Name', type: 'text', placeholder: 'Örn: BAPI_USER_GET_DETAIL' },
      { name: 'username', label: 'Test Kullanıcısı (Opsiyonel)', type: 'text', placeholder: 'TESTUSER' }
    ]
  }
];
// ---------------------------------


const BapiPopup = ({ open, onClose, onSave, initialData = {} }) => {
  
  // === STATE'LER ===
  const [formData, setFormData] = useState(initialData);
  const [sapConnections, setSapConnections] = useState([]);
  const [configFields, setConfigFields] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // === EFFECT'LER ===

  // Component açıldığında veya initialData değiştiğinde formu doldurur
  useEffect(() => {
    setFormData(initialData);
  }, [initialData, open]);

  // SAP bağlantı listesini yükler (Şu an sahte veriden, ileride API'den)
  useEffect(() => {
    // API çağrısını simüle etmek için küçük bir gecikme ekleyelim
    setIsLoading(true);
    setTimeout(() => {
      setSapConnections(MOCK_SOURCES);
      setIsLoading(false);
    }, 1000); // 1 saniye bekle
  }, []);

  // Kullanıcı bir bağlantı seçtiğinde, o bağlantının dinamik alanlarını state'e yazar
  useEffect(() => {
    if (formData.connectionId) {
      const selected = sapConnections.find(s => s.id === formData.connectionId);
      setConfigFields(selected ? selected.fields : []);
    } else {
      setConfigFields([]);
    }
  }, [formData.connectionId, sapConnections]);


  // === FONKSİYONLAR ===
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Kaydedilecek veriyi parent component'e gönder
    onSave(formData);
    onClose(); // Pencereyi kapat
  };

  // Dinamik olarak form alanlarını render eder
  const renderDynamicFields = () => {
    if (!formData.connectionId) {
      return <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>Özellikleri görmek için bir bağlantı seçin.</Typography>;
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

  // === ANA JSX YAPISI ===
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        BAPI Düğümünü Yapılandır
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: (theme) => theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Typography gutterBottom>
          Akıştaki bu adım için açıklayıcı bir isim ve bağlantı detaylarını girin.
        </Typography>

        {/* Custom Name Alanı */}
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

        {/* SAP Connection Dropdown */}
        <FormControl fullWidth margin="normal" disabled={isLoading}>
          <InputLabel id="sap-connection-label">SAP Bağlantısı</InputLabel>
          <Select
            labelId="sap-connection-label"
            name="connectionId"
            value={formData.connectionId || ''}
            label="SAP Bağlantısı"
            onChange={handleChange}
          >
            <MenuItem value=""><em>Seçilmedi</em></MenuItem>
            {sapConnections.map((conn) => (
              <MenuItem key={conn.id} value={conn.id}>{conn.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* Dinamik Alanların Gösterildiği Bölüm */}
        <Box sx={{ minHeight: 150 }}>
          <Typography variant="h6" gutterBottom>Bağlantı Özellikleri</Typography>
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

export default BapiPopup;