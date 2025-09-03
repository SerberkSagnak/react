import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

// Colors and icons for node types
const nodeStyles = {
  bapi: { icon: 'B', backgroundColor: '#cce5ff', borderColor: '#b8daff' },
  query: { icon: 'Q', backgroundColor: '#d4edda', borderColor: '#c3e6cb' },
  tableSource: { icon: 'T', backgroundColor: '#fff3cd', borderColor: '#ffeeba' },
  file: { icon: 'F', backgroundColor: '#f8d7da', borderColor: '#f5c6cb' },
  tableDestination: { icon: 'T', backgroundColor: '#e2e3e5', borderColor: '#d6d8db' },
  default: { icon: 'D', backgroundColor: '#fefefe', borderColor: '#ddd' },
  input: { icon: 'I', backgroundColor: '#fefefe', borderColor: '#ddd' },
  output: { icon: 'O', backgroundColor: '#fefefe', borderColor: '#ddd' },
};

// Classify node types by their roles
const nodeRoles = {
  source: ['bapi', 'query', 'tableSource', 'input'],
  destination: ['file', 'tableDestination', 'output'],
  transform: ['default'],
};

const CustomNode = ({ data, type }) => {
  const baseStyle = nodeStyles[type] || nodeStyles.default;
  
  // Determine style based on execution status
  const executionStatus = data.executionStatus;
  const getExecutionStyle = () => {
    switch (executionStatus) {
      case 'waiting':
        return { backgroundColor: '#f8f9fa', borderColor: '#dee2e6', opacity: 0.7 };
      case 'processing':
        return { backgroundColor: '#fff3cd', borderColor: '#ffc107', boxShadow: '0 0 10px rgba(255,193,7,0.5)' };
      case 'completed':
        return { backgroundColor: '#d4edda', borderColor: '#28a745', boxShadow: '0 0 10px rgba(40,167,69,0.3)' };
      case 'error':
        return { backgroundColor: '#f8d7da', borderColor: '#dc3545', boxShadow: '0 0 10px rgba(220,53,69,0.3)' };
      default:
        return baseStyle;
    }
  };

  const style = executionStatus ? getExecutionStyle() : baseStyle;

  const isSource = nodeRoles.source.includes(type);
  const isDestination = nodeRoles.destination.includes(type);
  const isTransform = nodeRoles.transform.includes(type);
  
  // Made label logic cleaner and more directive.
  const hasCustomName = data.customName && data.customName.trim() !== '';
  const nodeLabel = hasCustomName ? data.customName : '(Double-click to configure)';

  // Execution status icon
  const getStatusIcon = () => {
    switch (executionStatus) {
      case 'waiting': return '⏳';
      case 'processing': return '🟡';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '';
    }
  };

  return (
    <Box sx={{
      backgroundColor: style.backgroundColor,
      border: `1px solid ${style.borderColor}`,
      borderRadius: '8px',
      width: 200, // Increased width slightly
      textAlign: 'center',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      opacity: hasCustomName ? 1 : 0.95, // Slightly faded if not configured
    }}>
      {/* Show input point only on target or transform nodes */}
      {(isDestination || isTransform) && (
        <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      )}
      
      <Box sx={{
        padding: '5px 10px',
        borderBottom: `1px solid ${style.borderColor}`,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
      }}>
        <Box sx={{
          width: 20, height: 20, borderRadius: '50%',
          backgroundColor: style.borderColor, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          mr: 1, color: '#333', flexShrink: 0,
        }}>
          {style.icon}
        </Box>
        <Typography variant="caption" sx={{ textTransform: 'capitalize', fontWeight: 'bold', flex: 1 }}>
          {type}
        </Typography>
        {/* Execution status icon */}
        {getStatusIcon() && (
          <Typography sx={{ fontSize: '1rem', ml: 1 }}>
            {getStatusIcon()}
          </Typography>
        )}
      </Box>
      <Box sx={{ padding: '10px 15px', minHeight: '20px' }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontStyle: hasCustomName ? 'normal' : 'italic', 
            color: hasCustomName ? 'inherit' : 'text.secondary',
            wordWrap: 'break-word',
          }}
        >
          {nodeLabel}
        </Typography>
      </Box>

      {/* Show output point only on source or transform nodes */}
      {(isSource || isTransform) && (
        <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
      )}
    </Box>
  );
};

export default memo(CustomNode);
