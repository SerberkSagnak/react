import React, { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import Typography from '@mui/material/Typography';
import ReactFlow, { 
  ReactFlowProvider, 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge,
  useReactFlow,
  Background,
  Controls,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuth } from '../context/AuthContext';


// Projenizdeki diğer bileşenleri import ediyoruz
import Sidebar from '../Sidebar';
import CustomNode from '../CustomNode';
import NodeConfigModal from '../NodeConfigModal';
import ConfirmDialog from '../ConfirmDialog';

// React Flow için kullanılacak özel node tiplerini tanımlıyoruz
const nodeTypes = {
  bapi: CustomNode, query: CustomNode, tableSource: CustomNode,
  file: CustomNode, tableDestination: CustomNode, default: CustomNode,
  output: CustomNode, input: CustomNode,
};

// Uygulama ilk açıldığında görünecek varsayılan çalışma alanı
const initialFlows = { 'flow-1': { label: 'Yeni Akış 1', nodes: [], edges: [] } };

// Ana Builder bileşeni
function Builder() {
  // --- STATE (DURUM) YÖNETİMİ ---
  // Hafızada açık olan tüm çalışma alanlarını (akışları) tutar
  const [flows, setFlows] = useState(initialFlows);
  // O an hangi çalışma alanının aktif olduğunu tutar
  const [activeFlowId, setActiveFlowId] = useState('flow-1');
  // Yeni çalışma alanları için benzersiz ID üretmeye yarayan sayaç
  const [tabCounter, setTabCounter] = useState(2);
  // Veritabanından çekilen kayıtlı akışların listesini tutar
  const [templateList, setTemplateList] = useState([]);
  // Node konfigürasyon penceresinin (modal) açık olup olmadığını ve hangi node'u düzenlediğini tutar
  const [editingNodeId, setEditingNodeId] = useState(null);
  // Silme işlemi için onay penceresinin durumunu tutar
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, nodesToDelete: [], edgesToDelete: [] });
  // React Flow'un kendi fonksiyonlarına erişim sağlar (örn: koordinat hesaplama)
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();

  const { token } = useAuth();

  // --- API FONKSİYONLARI (VERİTABANI İLE İLETİŞİM) ---

  // Backend'den kullanıcının kayıtlı akış listesini çeker
  
  const fetchTemplates = useCallback(async () => {
    // Eğer token yoksa (kullanıcı giriş yapmamışsa) istek atma
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3001/api/templates', {
        headers: {
          'Authorization': `Bearer ${token}` // YETKİLENDİRME BAŞLIĞI EKLENDİ
        }
      });
      if (!response.ok) throw new Error('Liste alınamadı.');
      const data = await response.json();
      setTemplateList(data);
    } catch (error) {
      console.error("Şablon listesi alınamadı:", error);
    }
  }, [token]); // token'ı dependency array'e ekle

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Aktif çalışma alanını veritabanına "template" olarak kaydeder

  // BuilderView.jsx içindeki handleSaveTemplate fonksiyonunun DOĞRU HALİ
  const handleSaveTemplate = async () => {
    if (!token) {
      alert("Lütfen önce giriş yapın.");
      return;
    }
    const templateName = prompt("Lütfen bu akış için bir isim girin:");
    if (!templateName || templateName.trim() === '') {
      alert("Kaydetmek için bir isim girmelisiniz.");
      return;
    }
    const flowToSave = flows[activeFlowId];
    if (!flowToSave) return;
    const jsonData = { nodes: flowToSave.nodes, edges: flowToSave.edges };

    try {
      const response = await fetch('http://localhost:3001/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // YETKİLENDİRME BAŞLIĞI EKLENDİ
        },
        body: JSON.stringify({ templateName, jsonData }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kaydetme başarısız.");
      }
      alert("Akış başarıyla kaydedildi!");
      fetchTemplates();
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      alert(`Hata: ${error.message}`);
    }
  };
  // Veritabanından seçilen bir akışı yeni bir çalışma alanı olarak yükler
  const handleLoadTemplate = async (templateId, templateName) => {
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:3001/api/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${token}` // YETKİLENDİRME BAŞLIĞI EKLENDİ
        }
      });
      if (!response.ok) throw new Error('Akış yüklenemedi.');
      const flowData = await response.json();
      const newFlowId = `loaded-${templateId}-${Date.now()}`;
      const newFlow = { label: templateName, nodes: flowData.nodes || [], edges: flowData.edges || [] };
      setFlows(prevFlows => ({ ...prevFlows, [newFlowId]: newFlow }));
      setActiveFlowId(newFlowId);
    } catch (error) {
      console.error("Akış yüklenemedi:", error);
    }
  };

  // --- ARAYÜZ YÖNETİM FONKSİYONLARI ---

  // Yeni, boş bir çalışma alanı oluşturur
  const handleNewFlow = () => {
    const newFlowId = `flow-${tabCounter}`;
    const newFlowLabel = `Yeni Akış ${tabCounter}`;
    setFlows(prevFlows => ({
      ...prevFlows,
      [newFlowId]: { label: newFlowLabel, nodes: [], edges: [] }
    }));
    setTabCounter(c => c + 1);
    setActiveFlowId(newFlowId); // Yeni oluşturulan akışı aktif hale getir
  };

  // Açık çalışma alanları arasında geçiş yapar
  const handleSwitchFlow = (flowId) => {
    setActiveFlowId(flowId);
  };
  
  // --- REACT FLOW CALLBACK FONKSİYONLARI ---

  const onNodesChange = useCallback((changes) => {
    setFlows((fs) => ({ ...fs, [activeFlowId]: { ...fs[activeFlowId], nodes: applyNodeChanges(changes, fs[activeFlowId].nodes) }}));
  }, [activeFlowId]);

  const onEdgesChange = useCallback((changes) => {
    setFlows((fs) => ({ ...fs, [activeFlowId]: { ...fs[activeFlowId], edges: applyEdgeChanges(changes, fs[activeFlowId].edges) }}));
  }, [activeFlowId]);

  const onConnect = useCallback((connection) => {
    setFlows((fs) => ({ ...fs, [activeFlowId]: { ...fs[activeFlowId], edges: addEdge(connection, fs[activeFlowId].edges) }}));
  }, [activeFlowId]);
  
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (typeof type === 'undefined' || !type) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode = {
      id: `dndnode_${Date.now()}`,
      type,
      position,
      data: { label: `${type} node` },
    };
    setFlows((fs) => ({ ...fs, [activeFlowId]: { ...fs[activeFlowId], nodes: [...fs[activeFlowId].nodes, newNode] } }));
  }, [screenToFlowPosition, activeFlowId]);

  const onNodeDoubleClick = useCallback((event, node) => { setEditingNodeId(node.id); }, []);
  
  const handleRunFlow = () => { /* Bu fonksiyonu bir önceki cevaptaki gibi güncelleyebilirsiniz */ };

  const onNodeDataChange = (nodeId, newData) => {
    setFlows((fs) => {
      const newNodes = fs[activeFlowId].nodes.map((node) => node.id === nodeId ? { ...node, data: newData } : node);
      return { ...fs, [activeFlowId]: { ...fs[activeFlowId], nodes: newNodes } };
    });
  };

  const currentFlow = flows[activeFlowId];
  const nodeToEdit = currentFlow?.nodes.find((node) => node.id === editingNodeId);

  // --- ARAYÜZ (RENDER) ---
  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%' }}>
      <Sidebar 
        openFlows={flows}
        activeFlowId={activeFlowId}
        onSwitchFlow={handleSwitchFlow}
        onNewFlow={handleNewFlow}
        savedTemplates={templateList} 
        onLoadTemplate={handleLoadTemplate}
      />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
            <Typography variant="h6" sx={{ ml: 2 }}>
                Çalışma Alanı: {currentFlow?.label}
            </Typography>
            <Box>
                <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSaveTemplate} sx={{ mr: 2 }}>
                    Akışı Kaydet
                </Button>
                <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleRunFlow}>
                    Run Flow
                </Button>
            </Box>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          {currentFlow && (
            <ReactFlow
              key={activeFlowId}
              nodes={currentFlow.nodes}
              edges={currentFlow.edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onNodeDoubleClick={onNodeDoubleClick}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          )}
        </Box>
      </Box>
      <NodeConfigModal 
        isOpen={!!editingNodeId} 
        onClose={() => setEditingNodeId(null)} 
        nodeData={nodeToEdit} 
        onNodeDataChange={onNodeDataChange}
      />
      <ConfirmDialog 
        isOpen={deleteConfirmation.isOpen} 
        onClose={() => setDeleteConfirmation({ isOpen: false, nodesToDelete: [], edgesToDelete: [] })} 
        onConfirm={() => {/* Silme mantığı buraya eklenebilir */}} 
        title="Confirm Deletion" 
        message={`...`} 
      />
    </Box>
  );
}

export default function BuilderView() { 
  return (<ReactFlowProvider><Builder /></ReactFlowProvider>) 
}