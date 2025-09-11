import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

import BapiPopup from './popup/bapi_popup.jsx';
import QueryPopup from './popup/query_popup.jsx';
import DefaultPopup from './popup/default_popup.jsx';
import TableSourcePopup from './popup/table_source_popup.jsx';
import TableDestinationPopup from './popup/table_destination_popup.jsx';

const NodeConfigModal = ({ isOpen, onClose, nodeData, onNodeDataChange, allNodes, allEdges }) => {
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

  // Kendi modal'ını yöneten popup'lar
  if (nodeData.type === 'bapi') {
    return (
      <BapiPopup
        open={isOpen}
        onClose={onClose}
        onSave={handleSave}
        initialData={nodeData.data || {}}
      />
    );
  }

  if (nodeData.type === 'tableSource') {
    return (
      <TableSourcePopup
        open={isOpen}
        setOpen={(open) => !open && onClose()}
        onSave={handleSave}
        initialData={nodeData.data || {}}
      />
    );
  }

  if (nodeData.type === 'tableDestination') {
    // TableDestination için source data'yı edge connection'lardan bul
    let sourceData = nodeData.data?.sourceData || null;
    
    // Eğer sourceData yoksa, bağlı olan source node'ları ara
    if (!sourceData && allNodes && allEdges) {
      const incomingEdges = allEdges.filter(edge => edge.target === nodeData.id);
      if (incomingEdges.length > 0) {
        const sourceNodeId = incomingEdges[0].source; // İlk bağlı source'u al
        const sourceNode = allNodes.find(node => node.id === sourceNodeId);
        if (sourceNode && sourceNode.data && sourceNode.data.isConfigured) {
          sourceData = sourceNode.data;
        }
      }
    }
    
    return (
      <TableDestinationPopup
        open={isOpen}
        setOpen={(open) => !open && onClose()}
        onSave={handleSave}
        sourceData={sourceData}
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