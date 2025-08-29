import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

import BapiPopup from './popup/bapi_popup.jsx';
import QueryPopup from './popup/query_popup.jsx';
import DefaultPopup from './popup/default_popup.jsx';

const NodeConfigModal = ({ isOpen, onClose, nodeData, onNodeDataChange }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (nodeData) {
      setFormData({ ...(nodeData.data || {}) });
    }
  }, [nodeData]);

  if (!isOpen || !nodeData) {
    return null;
  }

  const handleSave = (updatedData) => {
    // Eğer pop-up'tan veri gelirse onu kullan, gelmezse lokal state'i kullan.
    const dataToSave = updatedData || formData;
    onNodeDataChange(nodeData.id, dataToSave);
    onClose();
  };

  // BAPI tipi kendi modal'ını yönettiği için onu ayrı tutuyoruz.
  if (nodeData.type === 'bapi') {
    return (
      <BapiPopup
        open={isOpen}
        onClose={onClose}
        onSave={handleSave} // handleSave, BapiPopup'tan gelen veriyi işler.
        initialData={nodeData.data || {}}
      />
    );
  }

  // Diğer tüm pop-up tipleri için genel bir Dialog sarmalayıcı kullanıyoruz.
  const renderGenericPopupContent = () => {
    switch (nodeData.type) {
      case 'query':
        return <QueryPopup nodeData={nodeData} formData={formData} setFormData={setFormData} />;
      default:
        return <DefaultPopup nodeData={nodeData} />;
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Configure Node: {nodeData.type}</DialogTitle>
      <DialogContent dividers>
        {renderGenericPopupContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={() => handleSave()} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NodeConfigModal;