import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

// Pop-up bileşenlerini doğru yollardan import ediyoruz
import BapiPopup from './popup/bapi_popup.jsx';
import QueryPopup from './popup/query_popup.jsx';
import DefaultPopup from './popup/default_popup.jsx'; // Düzeltildi: Dosya yolu hatası giderildi

const NodeConfigModal = ({ isOpen, onClose, nodeData, onNodeDataChange }) => {
  // Pop-up içindeki formun geçici state'ini burada tutuyoruz
  const [formData, setFormData] = useState({});

  // Modal her açıldığında (yani nodeData değiştiğinde),
  // form state'ini o node'un mevcut verileriyle dolduruyoruz.
  useEffect(() => {
    if (nodeData) {
      // nodeData.data'nın bir kopyasını alıyoruz ki orijinal veriyi bozmayalım
      setFormData({ ...(nodeData.data || {}) });
    }
  }, [nodeData]);

  // Modal kapalıysa veya gösterilecek bir düğüm yoksa, hiçbir şey çizme
  if (!isOpen || !nodeData) {
    return null;
  }

  // Düğümün tipine göre doğru pop-up içeriğini seçen fonksiyon
  const renderPopupContent = () => {
    switch (nodeData.type) {
      case 'bapi':
        // formData'yı ve onu güncelleyecek fonksiyonu BapiPopup'a iletiyoruz
        return <BapiPopup formData={formData} setFormData={setFormData} />;
      case 'query':
        // Query için de aynı mantık kurulacak
        return <QueryPopup nodeData={nodeData} />;
      default:
        return <DefaultPopup nodeData={nodeData} />;
    }
  };

  // "Save" butonuna basıldığında çalışan fonksiyon
  const handleSave = () => {
    // Pop-up içinde güncellenen form verisini olduğu gibi bir üst bileşene yolluyoruz
    onNodeDataChange(nodeData.id, formData);
    onClose(); // Modal'ı kapat
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Configure Node: {nodeData.type}</DialogTitle>
      <DialogContent dividers>
        {renderPopupContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NodeConfigModal;
