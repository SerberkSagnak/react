import { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
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

import Sidebar from '../Sidebar';
import CustomNode from '../CustomNode';
import NodeConfigModal from '../NodeConfigModal';
import ConfirmDialog from '../ConfirmDialog';

// Performans için bu objeyi fonksiyonun DIŞINDA tanımlıyoruz
const nodeTypes = {
  bapi: CustomNode, query: CustomNode, tableSource: CustomNode,
  file: CustomNode, tableDestination: CustomNode, default: CustomNode,
  output: CustomNode, input: CustomNode,
};

const flowKey = 'flow-designer-data';

const initialFlows = {
  'company-1': { label: 'Company 1', nodes: [], edges: [] },
};

let id = 0;
const getId = (nodes) => {
    const maxId = nodes.reduce((max, node) => {
        const nodeIdNum = parseInt(node.id.split('_')[1], 10);
        return nodeIdNum > max ? nodeIdNum : max;
    }, -1);
    id = maxId + 1;
    return `dndnode_${id}`;
};

function Builder() {
  const [activeTab, setActiveTab] = useState('company-1');
  const [flows, setFlows] = useState(() => {
    const savedFlows = localStorage.getItem(flowKey);
    return savedFlows ? JSON.parse(savedFlows) : initialFlows;
  });
  const [tabCounter, setTabCounter] = useState(() => {
    const savedFlows = localStorage.getItem(flowKey);
    return savedFlows ? Object.keys(JSON.parse(savedFlows)).length + 1 : 2;
  });
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, nodesToDelete: [], edgesToDelete: [] });
  const { screenToFlowPosition } = useReactFlow();

  // Veriyi kalıcı hale getiren useEffect
  useEffect(() => {
    localStorage.setItem(flowKey, JSON.stringify(flows));
  }, [flows]);

  // Düğüm değişikliklerini (sürükleme, silme vb.) yöneten fonksiyon
  const onNodesChange = useCallback((changes) => {
    const removeChanges = changes.filter(c => c.type === 'remove');
    const otherChanges = changes.filter(c => c.type !== 'remove');
    if (removeChanges.length) {
      const nodeIdsToDelete = removeChanges.map(c => c.id);
      const nodesToDelete = flows[activeTab].nodes.filter(n => nodeIdsToDelete.includes(n.id));
      const connectedEdges = flows[activeTab].edges.filter(e => nodeIdsToDelete.includes(e.source) || nodeIdsToDelete.includes(e.target));
      setDeleteConfirmation({ isOpen: true, nodesToDelete, edgesToDelete: connectedEdges });
    }
    if (otherChanges.length) {
      setFlows((fs) => ({...fs, [activeTab]: { ...fs[activeTab], nodes: applyNodeChanges(otherChanges, fs[activeTab].nodes) },}));
    }
  }, [activeTab, flows]);

  const onEdgesChange = useCallback((changes) => {
    const removeChanges = changes.filter(c => c.type === 'remove');
    const otherChanges = changes.filter(c => c.type !== 'remove');
    if (removeChanges.length) {
      const edgeIdsToDelete = removeChanges.map(c => c.id);
      const edgesToDelete = flows[activeTab].edges.filter(e => edgeIdsToDelete.includes(e.id));
      setDeleteConfirmation({ isOpen: true, nodesToDelete: [], edgesToDelete });
    }
    if (otherChanges.length) {
      setFlows((fs) => ({...fs, [activeTab]: { ...fs[activeTab], edges: applyEdgeChanges(otherChanges, fs[activeTab].edges) },}));
    }
  }, [activeTab, flows]);

  const onConnect = useCallback((connection) => { setFlows((fs) => ({...fs, [activeTab]: {...fs[activeTab], edges: addEdge(connection, fs[activeTab].edges),},})); }, [activeTab]);
  const onNodeDoubleClick = useCallback((event, node) => { setEditingNodeId(node.id); }, []);
  const handleTabChange = (event, newValue) => setActiveTab(newValue);
  const handleAddTab = () => { const newTabId = `company-${tabCounter}`; const newTabLabel = `Company ${tabCounter}`; setFlows({ ...flows, [newTabId]: { label: newTabLabel, nodes: [], edges: [] } }); setTabCounter((c) => c + 1); };
  const onDragOver = useCallback((event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }, []);
  const onDrop = useCallback((event) => { event.preventDefault(); const type = event.dataTransfer.getData('application/reactflow'); const position = screenToFlowPosition({ x: event.clientX, y: event.clientY }); const allNodes = Object.values(flows).flatMap(flow => flow.nodes); const newNode = { id: getId(allNodes), type, position, data: { label: `${type} node` } }; setFlows((fs) => ({ ...fs, [activeTab]: { ...fs[activeTab], nodes: [...fs[activeTab].nodes, newNode] } })); }, [activeTab, screenToFlowPosition, flows]);

  const handleConfirmDelete = () => {
    const { nodesToDelete, edgesToDelete } = deleteConfirmation;
    const nodeIdsToDelete = nodesToDelete.map(n => n.id);
    const edgeIdsToDelete = edgesToDelete.map(e => e.id);
    setFlows(fs => ({ ...fs, [activeTab]: { ...fs[activeTab], nodes: fs[activeTab].nodes.filter(n => !nodeIdsToDelete.includes(n.id)), edges: fs[activeTab].edges.filter(e => !edgeIdsToDelete.includes(e.id)) } }));
    setDeleteConfirmation({ isOpen: false, nodesToDelete: [], edgesToDelete: [] });
  };
  const handleCancelDelete = () => { setDeleteConfirmation({ isOpen: false, nodesToDelete: [], edgesToDelete: [] }); };

  const handleRunFlow = () => {
    const currentFlowData = flows[activeTab];
    console.log("----- EXECUTING FLOW -----");
    console.log(JSON.stringify(currentFlowData, null, 2));
    alert("Flow data has been logged to the console.");
  };

  const onNodeDataChange = (nodeId, newData) => {
    setFlows((fs) => {
      const newNodes = fs[activeTab].nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: newData };
        }
        return node;
      });
      return { ...fs, [activeTab]: { ...fs[activeTab], nodes: newNodes } };
    });
  };

  const nodeToEdit = flows[activeTab]?.nodes.find((node) => node.id === editingNodeId);
  const currentFlow = flows[activeTab];

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ flexGrow: 1 }}>
            {Object.keys(flows).map((flowId) => ( <Tab key={flowId} label={flows[flowId].label} value={flowId} /> ))}
            <Tab icon={<AddIcon />} onClick={handleAddTab} sx={{ minWidth: '60px' }} />
          </Tabs>
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleRunFlow} sx={{ mr: 2, ml: 2, whiteSpace: 'nowrap' }}>
            Run Flow
          </Button>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          {currentFlow && (
            <ReactFlow
              key={activeTab}
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
              <Background variant="dots" gap={12} size={1} />
              <Controls />
              <MiniMap nodeStrokeWidth={3} zoomable pannable />
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
        onClose={handleCancelDelete} 
        onConfirm={handleConfirmDelete} 
        title="Confirm Deletion" 
        message={`Are you sure you want to delete ${deleteConfirmation.nodesToDelete.length} node(s) and ${deleteConfirmation.edgesToDelete.length} edge(s)?`} 
      />
    </Box>
  );
}

export default function BuilderView() { 
  return (<ReactFlowProvider><Builder /></ReactFlowProvider>) 
}
