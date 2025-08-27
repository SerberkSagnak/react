import Typography from '@mui/material/Typography';

const DefaultPopup = ({ nodeData }) => {
  return (
    <div>
      <Typography variant="h6" gutterBottom>Default Configuration</Typography>
      <Typography variant="body2">
        Configuration for node type '{nodeData.type}' (ID: {nodeData.id}) is not yet implemented.
      </Typography>
    </div>
  );
};

export default DefaultPopup;