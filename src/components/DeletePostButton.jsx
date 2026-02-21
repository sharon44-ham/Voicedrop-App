// src/components/DeletePostButton.jsx
// Replace your entire file with this MINIMAL version

import React, { useState } from 'react';

const DeletePostButton = ({ postId, onDeleteSuccess }) => {
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('voicedrop_token');
      const response = await fetch(`https://voicedrop-backend-99zl.onrender.com/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        onDeleteSuccess(postId);
        alert('Deleted!');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setShowModal(false);
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="delete-btn-simple"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 999,
          background: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '35px',
          height: '35px',
          cursor: 'pointer',
          fontSize: '18px'
        }}
      >
        ×
      </button>

      {showModal && (
        <div 
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '15px',
              textAlign: 'center'
            }}
          >
            <h3 style={{ color: 'black', marginBottom: '15px' }}>Delete Post?</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#eee',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                style={{
                  padding: '10px 20px',
                  background: 'red',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeletePostButton;