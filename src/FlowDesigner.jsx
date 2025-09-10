import React, { useState, useCallback, useEffect } from 'react'; // useEffect import edildi
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import SavedFlowsList from './SavedFlowsList';

const initialNodes = [];
const initialEdges = [];

const FlowDesignerContent = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [currentFlowId, setCurrentFlowId] = useState(null);

  // Builder menüsündeki listeyi tutacak olan state
  const [builderItems, setBuilderItems] = useState([
    { id: 'new', name: 'New Flow' }
  ]);

  // --- HATA AYIKLAMA (DEBUGGING) İÇİN EKLENDİ ---
  // Bu kod, builderItems state'i her değiştiğinde güncel içeriğini konsola yazdıracak.
  useEffect(() => {
    console.log('--- BUILDER ITEMS STATE GÜNCELLENDİ ---');
    console.log(JSON.stringify(builderItems, null, 2));
  }, [builderItems]);
  // --- HATA AYIKLAMA KODU SONU ---

  const reactFlowInstance = useReactFlow();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNewFlow = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentFlowId(null);
    setBuilderItems([
      { id: 'new', name: 'New Flow' }
    ]);
    reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
  };

  const onSave = async () => {
    const currentName = builderItems.find(item => item.id === currentFlowId)?.name || '';
    const flowName = prompt("Lütfen akışınıza bir isim verin:", currentName);

    if (!flowName || flowName.trim() === '') {
      alert("Geçerli bir isim girmediniz. Kaydetme iptal edildi.");
      return;
    }

    const flowData = {
      nodes: reactFlowInstance.getNodes(),
      edges: reactFlowInstance.getEdges(),
      viewport: reactFlowInstance.getViewport(),
    };

    try {
      if (currentFlowId) {
        await axios.put(`/api/flows/${currentFlowId}`, { name: flowName, content: flowData });
        alert("Akış başarıyla güncellendi!");
        setBuilderItems(prev => prev.map(item => item.id === currentFlowId ? { ...item, name: flowName } : item));
      } else {
        const response = await axios.post('/api/flows', { name: flowName, content: flowData });
        const newFlowId = response.data.id;
        setCurrentFlowId(newFlowId);
        setBuilderItems([
            { id: 'new', name: 'New Flow' },
            { id: newFlowId, name: flowName }
        ]);
        alert("Akış başarıyla kaydedildi!");
      }
    } catch (error) {
      console.error("Akış kaydedilirken hata:", error);
      alert("Hata: Akış kaydedilemedi.");
    }
  };

  const onLoadFlow = async (flowId) => {
    try {
      const response = await axios.get(`/api/flows/${flowId}`);
      const flowData = response.data.content;
      const flowName = response.data.name;

      if (flowData) {
        setNodes(flowData.nodes || []);
        setEdges(flowData.edges || []);
        reactFlowInstance.setViewport(flowData.viewport || { x: 0, y: 0, zoom: 1 });
        setCurrentFlowId(flowId);
        setBuilderItems([
          { id: 'new', name: 'New Flow' },
          { id: flowId, name: flowName }
        ]);
      }
    } catch (error) {
      console.error("Akış yüklenirken hata:", error);
      alert("Hata: Akış yüklenemedi.");
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      {/* --- KENAR ÇUBUĞU (SIDEBAR) CSS DÜZELTMESİYLE GÜNCELLENDİ --- */}
      <aside style={{
          width: '250px',
          borderRight: '1px solid #ccc',
          height: '100vh', 
          display: 'flex',
          flexDirection: 'column'
      }}>
          {/* Sabit Başlık Alanı */}
          <div style={{ padding: '10px 10px 0 10px' }}>
              <h3>Flow Designer</h3>
          </div>

          {/* Kaydırılabilir İçerik Alanı */}
          <div style={{
              flex: 1, 
              overflowY: 'auto', 
              padding: '0 10px 10px 10px'
          }}>
              {/* Builder Bölümü */}
              <h3>Builder</h3>
              <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0 0 10px 0' }}>
                {builderItems.map(item => (
                   <li 
                     key={item.id} 
                     style={{ padding: '5px 0', cursor: 'pointer', fontWeight: item.id === currentFlowId ? 'bold' : 'normal' }} 
                     onClick={() => item.id === 'new' && onNewFlow()}
                   >
                    <span style={{ marginRight: '8px' }}>{item.id === 'new' ? '➕' : '📝'}</span>
                    {item.name}
                  </li>
                ))}
              </ul>
              <hr />
              
              {/* Diğer menü elemanları */}
              <h4>Node Kütüphanesi</h4>
              <div style={{border: '1px dashed #aaa', padding: '10px', marginBottom: '20px'}}>
                  BAPI, Query, Table...
              </div>
              
              <SavedFlowsList onLoadFlow={onLoadFlow} />
          </div>
      </aside>
      {/* --- KENAR ÇUBUĞU BÖLÜMÜ SONU --- */}
      
      <main style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          <button onClick={onSave} style={{ padding: '10px 20px', fontSize: '16px' }}>
            SAVE FLOW
          </button>
        </div>
      </main>
    </div>
  );
};

// Ana component, sadece Provider'ı sarmalamakla görevli.
const FlowDesigner = () => {
  return (
    <ReactFlowProvider>
      <FlowDesignerContent />
    </ReactFlowProvider>
  );
};

export default FlowDesigner;