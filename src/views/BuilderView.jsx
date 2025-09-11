import React, { useState, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
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


// Import other components from the project
import Sidebar from '../Sidebar';
import CustomNode from '../CustomNode';
import NodeConfigModal from '../NodeConfigModal';
import ConfirmDialog from '../ConfirmDialog';

// Define custom node types for React Flow
const nodeTypes = {
  bapi: CustomNode, query: CustomNode, tableSource: CustomNode,
  file: CustomNode, tableDestination: CustomNode, default: CustomNode,
  output: CustomNode, input: CustomNode,
};

// Default workspace shown when the application first opens
const initialFlows = { 'flow-1': { label: 'New Flow', nodes: [], edges: [] } };

// Main Builder component
function Builder() {
  // --- STATE MANAGEMENT ---
  // Holds all open workspaces (flows) in memory
  const [flows, setFlows] = useState(initialFlows);
  // Tracks which workspace is currently active
  const [activeFlowId, setActiveFlowId] = useState('flow-1');
  // Counter for generating unique IDs for new workspaces
  const [tabCounter, setTabCounter] = useState(2);
  // Holds the list of saved flows retrieved from the database
  const [templateList, setTemplateList] = useState([]);
  // Track template ID for each flow (for saving/updating)
  const [flowTemplateIds, setFlowTemplateIds] = useState({});
  // State for custom save dialog
  const [saveDialog, setSaveDialog] = useState({ open: false, templateName: '' });
  // State for snackbar notification
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  // Flow execution state tracking
  const [executionState, setExecutionState] = useState({ 
    isRunning: false, 
    nodeStatuses: {}, // {nodeId: 'waiting'|'processing'|'completed'|'error'}
    currentStep: 0 
  });
  // Tracks whether the node configuration window (modal) is open and which node is being edited
  const [editingNodeId, setEditingNodeId] = useState(null);
  // Tracks the state of the confirmation window for delete operations
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, nodesToDelete: [], edgesToDelete: [] });
  // Provides access to React Flow's own functions (e.g., coordinate calculation)
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();

  const { token } = useAuth();

  // --- API FUNCTIONS (DATABASE COMMUNICATION) ---

  // Fetches the user's saved flow list from the backend
  
  const fetchTemplates = useCallback(async () => {
    // Don't make request if token is not available (user not logged in)
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3001/api/templates', {
        headers: {
          'Authorization': `Bearer ${token}` // AUTHORIZATION HEADER ADDED
        }
      });
      if (!response.ok) throw new Error('Could not fetch list.');
      const data = await response.json();
      setTemplateList(data);
    } catch (error) {
      console.error("Could not fetch template list:", error);
    }
  }, [token]); // add token to dependency array

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Saves the active workspace to the database as a "template"

  // Function to open save dialog
  const handleSaveTemplate = () => {
    if (!token) {
      alert("Please log in first.");
      return;
    }

    const currentFlow = flows[activeFlowId];
    if (!currentFlow) return;

    const currentTemplateId = flowTemplateIds[activeFlowId];
    const isUpdate = !!currentTemplateId;

    if (isUpdate) {
      // Update - save directly
      performSave(currentFlow.label);
    } else {
      // New save - open dialog
      setSaveDialog({ open: true, templateName: '' });
    }
  };

  // Actual save operation
  const performSave = async (templateName) => {
    const currentFlow = flows[activeFlowId];
    const currentTemplateId = flowTemplateIds[activeFlowId];
    const isUpdate = !!currentTemplateId;
    const jsonData = { nodes: currentFlow.nodes, edges: currentFlow.edges };

    console.log('DEBUG - Save operation:', { 
      activeFlowId, 
      currentTemplateId, 
      isUpdate, 
      templateName,
      flowTemplateIds 
    });

    try {
      const url = isUpdate 
        ? `http://localhost:3001/api/templates/${currentTemplateId}`
        : 'http://localhost:3001/api/templates';
      
      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ templateName, jsonData }),
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message;
        } catch {
          // JSON parse error - probably returning HTML
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage || "Operation failed.");
      }

      const result = await response.json();
      
      if (!isUpdate && result.templateId) {
        setFlowTemplateIds(prev => ({ ...prev, [activeFlowId]: result.templateId }));
      }

      setFlows(prev => ({
        ...prev,
        [activeFlowId]: { ...prev[activeFlowId], label: templateName }
      }));

      setNotification({ 
        open: true, 
        message: isUpdate ? "Flow updated!" : "Flow saved successfully!", 
        severity: 'success' 
      });
      fetchTemplates();
      setSaveDialog({ open: false, templateName: '' });
    } catch (error) {
      console.error("Save error:", error);
      setNotification({ 
        open: true, 
        message: `Error: ${error.message}`, 
        severity: 'error' 
      });
    }
  };

  // Save dialog confirmation
  const handleSaveConfirm = () => {
    if (!saveDialog.templateName.trim()) {
      alert("Please enter a name.");
      return;
    }
    performSave(saveDialog.templateName);
  };
  // Loads a selected flow from the database (uses existing tab if available)
  const handleLoadTemplate = async (templateId, templateName) => {
    if (!token) return;

    // First check if this template is already open
    const existingFlowId = Object.keys(flows).find(flowId => 
      flowId.startsWith(`loaded-${templateId}-`)
    );

    if (existingFlowId) {
      // Already open, just switch to that tab
      setActiveFlowId(existingFlowId);
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${token}` // AUTHORIZATION HEADER ADDED
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          alert('This flow is no longer available.');
          fetchTemplates(); // Refresh list
          return;
        }
        throw new Error('Could not load flow.');
      }
      
      const flowData = await response.json();
      const newFlowId = `loaded-${templateId}-${Date.now()}`;
      const newFlow = { label: templateName, nodes: flowData.nodes || [], edges: flowData.edges || [] };
      setFlows(prevFlows => ({ ...prevFlows, [newFlowId]: newFlow }));
      
      // Store template ID (for updating)
      setFlowTemplateIds(prev => ({ ...prev, [newFlowId]: templateId }));
      
      setActiveFlowId(newFlowId);
    } catch (error) {
      console.error("Could not load flow:", error);
    }
  };

  // --- INTERFACE MANAGEMENT FUNCTIONS ---

  // Creates a new, empty workspace
  const handleNewFlow = () => {
    const newFlowId = `flow-${tabCounter}`;
    const newFlowLabel = `New Flow ${tabCounter}`;
    setFlows(prevFlows => ({
      ...prevFlows,
      [newFlowId]: { label: newFlowLabel, nodes: [], edges: [] }
    }));
    setTabCounter(c => c + 1);
    setActiveFlowId(newFlowId);
  };

  // Tab closing
  const handleCloseTab = (flowId, event) => {
    event.stopPropagation(); // Prevent tab click event
    
    const flowKeys = Object.keys(flows);
    if (flowKeys.length === 1) return; // Don't close the last tab

    const newFlows = { ...flows };
    delete newFlows[flowId];
    
    // Also clean up template ID mapping
    const newFlowTemplateIds = { ...flowTemplateIds };
    delete newFlowTemplateIds[flowId];
    
    setFlows(newFlows);
    setFlowTemplateIds(newFlowTemplateIds);
    
    // If active tab is closing, switch to another one
    if (activeFlowId === flowId) {
      const remainingFlowIds = Object.keys(newFlows);
      setActiveFlowId(remainingFlowIds[0]);
    }
  };

  // Tab switching
  const handleTabChange = (event, newFlowId) => {
    setActiveFlowId(newFlowId);
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
  
  const handleRunFlow = async () => {
    const currentTemplateId = flowTemplateIds[activeFlowId];
    const currentFlow = flows[activeFlowId];
    
    if (!currentTemplateId) {
      alert('This flow has not been saved yet. Please save first.');
      return;
    }

    // Start execution - set all nodes to waiting
    const nodeIds = currentFlow.nodes.map(n => n.id);
    const initialStatuses = {};
    nodeIds.forEach(id => { initialStatuses[id] = 'waiting'; });
    
    setExecutionState({
      isRunning: true,
      nodeStatuses: initialStatuses,
      currentStep: 0
    });

    // Update visual state of nodes
    setFlows(prevFlows => ({
      ...prevFlows,
      [activeFlowId]: {
        ...prevFlows[activeFlowId],
        nodes: prevFlows[activeFlowId].nodes.map(node => ({
          ...node,
          data: { 
            ...node.data, 
            executionStatus: 'waiting' 
          }
        }))
      }
    }));

    try {
      // Process nodes sequentially (simulation)
      for (let i = 0; i < nodeIds.length; i++) {
        const nodeId = nodeIds[i];
        
        // Set node to processing
        updateNodeStatus(nodeId, 'processing');
        setExecutionState(prev => ({ ...prev, currentStep: i + 1 }));
        
        // Wait 2 seconds (simulation)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Set node to completed
        updateNodeStatus(nodeId, 'completed');
      }

      // Call API
      const response = await fetch(`http://localhost:3001/api/templates/${currentTemplateId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setNotification({ 
          open: true, 
          message: `"${result.templateName}" flow executed successfully!`, 
          severity: 'success' 
        });
      } else {
        const error = await response.json();
        setNotification({ 
          open: true, 
          message: `Error: ${error.message}`, 
          severity: 'error' 
        });
      }
    } catch (err) {
      console.error('Run flow error:', err);
      setNotification({ 
        open: true, 
        message: 'An error occurred while running the flow.', 
        severity: 'error' 
      });
    } finally {
      setExecutionState({ isRunning: false, nodeStatuses: {}, currentStep: 0 });
    }
  };

  // Helper function to update node status
  const updateNodeStatus = (nodeId, status) => {
    setExecutionState(prev => ({
      ...prev,
      nodeStatuses: { ...prev.nodeStatuses, [nodeId]: status }
    }));
    
    setFlows(prevFlows => ({
      ...prevFlows,
      [activeFlowId]: {
        ...prevFlows[activeFlowId],
        nodes: prevFlows[activeFlowId].nodes.map(node => 
          node.id === nodeId 
            ? { ...node, data: { ...node.data, executionStatus: status } }
            : node
        )
      }
    }));
  };

  const onNodeDataChange = (nodeId, newData) => {
    setFlows((fs) => {
      const newNodes = fs[activeFlowId].nodes.map((node) => node.id === nodeId ? { ...node, data: newData } : node);
      return { ...fs, [activeFlowId]: { ...fs[activeFlowId], nodes: newNodes } };
    });
  };

  const currentFlow = flows[activeFlowId];
  const nodeToEdit = currentFlow?.nodes.find((node) => node.id === editingNodeId);

  // --- INTERFACE (RENDER) ---
  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%' }}>
      <Sidebar 
        openFlows={flows}
        activeFlowId={activeFlowId}
        onSwitchFlow={handleTabChange}
        onNewFlow={handleNewFlow}
        savedTemplates={templateList} 
        onLoadTemplate={handleLoadTemplate}
      />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Tab Bar */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', minHeight: 64 }}>
          <Tabs 
            value={activeFlowId} 
            onChange={handleTabChange} 
            variant="scrollable" 
            scrollButtons="auto"
            sx={{ flexGrow: 1 }}
          >
            {Object.entries(flows).map(([flowId, flow]) => (
              <Tab
                key={flowId}
                value={flowId}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {flow.label}
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleCloseTab(flowId, e)}
                      sx={{ ml: 1, p: 0.5 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
                sx={{ textTransform: 'none', maxWidth: 200 }}
              />
            ))}
          </Tabs>
          
          {/* New Tab and Save Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
            <IconButton onClick={handleNewFlow} color="primary">
              <AddIcon />
            </IconButton>
            <Button variant="outlined" startIcon={<SaveIcon />} onClick={handleSaveTemplate}>
              Save
            </Button>
            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleRunFlow}>
              Run
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
              defaultViewport={{ x: 50, y: 50, zoom: 0.8 }}
              fitViewOptions={{ maxZoom: 1.2, minZoom: 0.5 }}
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
        allNodes={flows[activeFlowId]?.nodes || []}
        allEdges={flows[activeFlowId]?.edges || []}
      />
      <ConfirmDialog 
        isOpen={deleteConfirmation.isOpen} 
        onClose={() => setDeleteConfirmation({ isOpen: false, nodesToDelete: [], edgesToDelete: [] })} 
        onConfirm={() => {/* Deletion logic can be added here */}} 
        title="Confirm Deletion" 
        message={`...`} 
      />

      {/* Custom Save Dialog */}
      <Dialog open={saveDialog.open} onClose={() => setSaveDialog({ open: false, templateName: '' })}>
        <DialogTitle>Flow Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Flow Name"
            type="text"
            fullWidth
            variant="outlined"
            value={saveDialog.templateName}
            onChange={(e) => setSaveDialog(prev => ({ ...prev, templateName: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveConfirm()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialog({ open: false, templateName: '' })}>
            Cancel
          </Button>
          <Button onClick={handleSaveConfirm} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notifications */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={4000} 
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function BuilderView() { 
  return (<ReactFlowProvider><Builder /></ReactFlowProvider>) 
}