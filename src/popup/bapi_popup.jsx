import { useData } from '../context/DataContext.jsx';
import { Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Grid } from '@mui/material';

const BapiPopup = ({ formData, setFormData }) => {
  // DataContext'ten mevcut SAP bağlantılarını alıyoruz
  const { sources } = useData();
  const sapSources = sources.filter(s => s.type === 'sap');
  
  // Dropdown'dan seçilen bağlantının tüm detaylarını buluyoruz
  const selectedConnection = sapSources.find(s => s.id === formData.connectionId);

  // Formdaki herhangi bir alan değiştiğinde bu fonksiyon çalışır
  const handleChange = (event) => {
    // Gelen değişikliği formun geçici state'ine yazar
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <Box component="form" noValidate autoComplete="off">
      <Typography variant="h6" gutterBottom>BAPI Configuration</Typography>
      
      {/* Düğüme özel bir isim vermek için bu alanı ekledik. */}
      <TextField
        fullWidth
        margin="dense"
        id="custom-name"
        name="customName"
        label="Custom Name (Optional)"
        variant="outlined"
        value={formData.customName || ''}
        onChange={handleChange}
        helperText="A descriptive name for this step in the flow."
      />

      {/* Tanımlı SAP bağlantılarından birini seçmek için dropdown menü */}
      <FormControl fullWidth margin="normal">
        <InputLabel id="sap-connection-select-label">SAP Connection</InputLabel>
        <Select
          labelId="sap-connection-select-label"
          id="sap-connection-select"
          value={formData.connectionId || ''}
          label="SAP Connection"
          name="connectionId"
          onChange={handleChange}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {sapSources.map((source) => (
            <MenuItem key={source.id} value={source.id}>
              {source.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {/* Bir bağlantı seçildiğinde, detaylarını gösteren salt-okunur alanlar */}
      {selectedConnection && (
        <Box sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2, my: 2, backgroundColor: '#fafafa' }}>
            <Typography variant="subtitle2" gutterBottom>Connection Details</Typography>
            <Grid container spacing={2}>
                <Grid item xs={6}><TextField label="Host" value={selectedConnection.host} fullWidth disabled variant="filled" /></Grid>
                <Grid item xs={6}><TextField label="Client" value={selectedConnection.client} fullWidth disabled variant="filled" /></Grid>
            </Grid>
        </Box>
      )}

      {/* Çalıştırılacak BAPI fonksiyonunun adının girildiği alan */}
      <TextField
        fullWidth
        margin="normal"
        id="function-name"
        name="functionName"
        label="Function Name"
        variant="outlined"
        value={formData.functionName || ''}
        onChange={handleChange}
        disabled={!formData.connectionId} // Bağlantı seçilmeden bu alan aktif olmaz
      />
    </Box>
  );
};

export default BapiPopup;
