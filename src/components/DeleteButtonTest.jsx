// TEST VERSION - This will ALWAYS show the delete button for debugging
// Use this temporarily to see if the button renders at all

import React, { useState } from 'react';

const DeletePostButton = ({ postId, currentUsername, postUsername, onDeleteSuccess }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // FORCE SHOW FOR TESTING - Remove after debugging
  console.log('🔍 Props:', { postId, currentUsername, postUsername });

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem('voicedrop_token');
      
      const response = await fetch(`https://voicedrop-backend-99zl.onrender.com/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      if (onDeleteSuccess) {
        onDeleteSuccess(postId);
      }

      setShowConfirmModal(false);
      alert('Post deleted!');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete post: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* BRIGHT RED BUTTON - You WILL see this if component is rendering */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowConfirmModal(true);
        }}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 999,
          background: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        🗑️
      </button>

      {showConfirmModal && (
        <div 
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
          onClick={() => setShowConfirmModal(false)}
        >
          <div 
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '20px',
              maxWidth: '400px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: 'black', marginBottom: '10px' }}>Delete Post?</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>This cannot be undone.</p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#eee',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'red',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeletePostButton;