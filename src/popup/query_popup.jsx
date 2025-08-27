import Typography from '@mui/material/Typography';

const QueryPopup = ({ nodeData }) => {
  return (
    <div>
      <Typography variant="h6" gutterBottom>Query Configuration</Typography>
      <Typography variant="body2">
        Configure the details for your Query node (ID: {nodeData.id}) here.
      </Typography>
    </div>
  );
};

export default QueryPopup;