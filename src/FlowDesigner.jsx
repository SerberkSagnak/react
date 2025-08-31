import React, { useState, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css'; // React Flow stillendirmesi için gerekli
import axios from 'axios';

// Varsayılan olarak projenizde olduğunu kabul ettiğimiz component'i import ediyoruz.
import SavedFlowsList from './SavedFlowsList'; 

// Başlangıçta boş bir tuval için
const initialNodes = [];
const initialEdges = [];

// React Flow hook'larının (useReactFlow gibi) çalışabilmesi için
// ana mantığı Provider'ın içinde bir child component'te yazmak en iyi pratiktir.
const FlowDesignerContent = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Üzerinde çalışılan mevcut akışın ID'sini tutmak için state.
  // Bu, yeni bir akışı mı yoksa mevcut bir akışı mı kaydettiğimizi anlamamızı sağlar.
  const [currentFlowId, setCurrentFlowId] = useState(null);
  
  // React Flow instance'ına erişim için hook. getNodes, setNodes gibi fonksiyonları sağlar.
  const reactFlowInstance = useReactFlow();

  // Node'ları birbirine bağladığımızda çalışan callback fonksiyonu
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // --- YENİ AKIŞ OLUŞTURMA ---
  const onNewFlow = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentFlowId(null); // Yeni bir akış olduğu için ID'yi sıfırla
    reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
    alert("Yeni ve boş bir akış tuvali oluşturuldu.");
  };

  // --- AKIŞI KAYDETME ---
  const onSave = async () => {
    // Not: Gerçek bir uygulamada prompt yerine şık bir modal kullanmak daha iyidir.
    const flowName = prompt("Lütfen akışınıza bir isim verin:");
    if (!flowName || flowName.trim() === '') {
      alert("Geçerli bir isim girmediniz. Kaydetme iptal edildi.");
      return;
    }

    // Akışın tüm verisini tek bir JSON objesinde toplayalım
    const flowData = {
      nodes: reactFlowInstance.getNodes(),
      edges: reactFlowInstance.getEdges(),
      viewport: reactFlowInstance.getViewport(),
    };

    try {
      if (currentFlowId) {
        // Mevcut bir ID varsa, bu bir güncellemedir (PUT isteği)
        await axios.put(`/api/flows/${currentFlowId}`, {
          name: flowName,
          content: flowData,
        });
        alert("Akış başarıyla güncellendi!");
      } else {
        // Mevcut bir ID yoksa, bu yeni bir kayıttır (POST isteği)
        const response = await axios.post('/api/flows', {
          name: flowName,
          content: flowData,
        });
        // Backend'den dönen yeni akış ID'sini state'e kaydedelim
        setCurrentFlowId(response.data.id);
        alert("Akış başarıyla kaydedildi!");
      }
    } catch (error) {
      console.error("Akış kaydedilirken hata:", error);
      alert("Hata: Akış kaydedilemedi.");
    }
  };

  // --- KAYITLI AKIŞI YÜKLEME ---
  const onLoadFlow = async (flowId) => {
    try {
      const response = await axios.get(`/api/flows/${flowId}`);
      const flowData = response.data.content;
      const flowName = response.data.name;

      if (flowData) {
        setNodes(flowData.nodes || []);
        setEdges(flowData.edges || []);
        reactFlowInstance.setViewport(flowData.viewport || { x: 0, y: 0, zoom: 1 });
        setCurrentFlowId(flowId); // Artık bu akış üzerinde çalıştığımızı belirtelim
        alert(`'${flowName}' adlı akış yüklendi.`);
      }
    } catch (error) {
      console.error("Akış yüklenirken hata:", error);
      alert("Hata: Akış yüklenemedi.");
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      {/* SOL MENÜ (SIDEBAR) */}
      <aside style={{ width: '250px', borderRight: '1px solid #ccc', padding: '10px' }}>
        <h3>Flow Designer</h3>
        <button onClick={onNewFlow}>Yeni Akış</button>
        <hr />
        {/* Burası sürükle-bırak için node kütüphaneniz olacak */}
        <h4>Node Kütüphanesi</h4>
        <div style={{border: '1px dashed #aaa', padding: '10px', marginBottom: '20px'}}>
            BAPI, Query, Table...
        </div>
        
        {/* Kayıtlı akışları listeleyen component */}
        <SavedFlowsList onLoadFlow={onLoadFlow} />
      </aside>

      {/* ANA TUVAL ALANI */}
      <main style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView // Tuval ilk açıldığında içeriği ortalar
        >
          <Background />
          <Controls />
        </ReactFlow>

        {/* KAYDETME BUTONU */}
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