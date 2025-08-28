// SavedFlowsList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Bu component, ana FlowDesigner'dan bir prop almalı: onLoadFlow
const SavedFlowsList = ({ onLoadFlow }) => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Component yüklendiğinde kullanıcının akışlarını API'den çek
    const fetchUserFlows = async () => {
      try {
        const response = await axios.get('/api/flows');
        setFlows(response.data);
      } catch (error) {
        console.error("Akışlar yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserFlows();
  }, []);

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div>
      <h4>Kayıtlı Akışlar</h4>
      <ul>
        {flows.map(flow => (
          <li key={flow.id} onClick={() => onLoadFlow(flow.id)} style={{cursor: 'pointer'}}>
            {flow.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SavedFlowsList;