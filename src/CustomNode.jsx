import { Handle, Position } from 'reactflow';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

// Düğüm tipleri için renk ve ikonlar
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

// Düğüm tiplerini rollerine göre sınıflandırıyoruz
const nodeRoles = {
  source: ['bapi', 'query', 'tableSource', 'input'],
  destination: ['file', 'tableDestination', 'output'],
  transform: ['default'],
};

const CustomNode = ({ data, type }) => {
  const style = nodeStyles[type] || nodeStyles.default;

  const isSource = nodeRoles.source.includes(type);
  const isDestination = nodeRoles.destination.includes(type);
  const isTransform = nodeRoles.transform.includes(type);
  
  // Etiket mantığını daha temiz ve yönlendirici hale getirdik.
  const hasCustomName = data.customName && data.customName.trim() !== '';
  const nodeLabel = hasCustomName ? data.customName : '(Double-click to configure)';

  return (
    <Box sx={{
      backgroundColor: style.backgroundColor,
      border: `1px solid ${style.borderColor}`,
      borderRadius: '8px',
      width: 200, // Genişliği biraz daha artırdık
      textAlign: 'center',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      opacity: hasCustomName ? 1 : 0.95, // Konfigüre edilmemişse biraz soluk
    }}>
      {/* Sadece hedef veya işlem düğümlerinde giriş noktası göster */}
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
        <Typography variant="caption" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
          {type}
        </Typography>
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

      {/* Sadece kaynak veya işlem düğümlerinde çıkış noktası göster */}
      {(isSource || isTransform) && (
        <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
      )}
    </Box>
  );
};

export default memo(CustomNode);
