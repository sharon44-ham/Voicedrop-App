// DeletePostButton.jsx - DEBUG VERSION
// Replace your current DeletePostButton.jsx with this to see what's happening

import React, { useState } from 'react';
import './DeletePostButton.css';

const DeletePostButton = ({ postId, currentUsername, postUsername, onDeleteSuccess }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // DEBUG: Log all props
  console.log('🔍 DeletePostButton Debug:', {
    postId,
    currentUsername,
    postUsername,
    shouldShow: currentUsername && currentUsername === postUsername
  });

  // Only show delete button if user owns the post
  if (!currentUsername || currentUsername !== postUsername) {
    console.log('❌ Not showing delete button - User does not own this post');
    return null;
  }

  console.log('✅ Showing delete button for post:', postId);

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem('voicedrop_token');
      console.log('🔑 Token found:', !!token);
      
      const response = await fetch(`https://voicedrop-backend-99zl.onrender.com/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Delete response:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Delete failed:', errorData);
        throw new Error(errorData.error || 'Failed to delete post');
      }

      console.log('✅ Post deleted successfully');

      // Call success callback
      if (onDeleteSuccess) {
        onDeleteSuccess(postId);
      }

      setShowConfirmModal(false);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete post: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button 
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          console.log('🗑️ Delete button clicked');
          setShowConfirmModal(true);
        }}
        title="Delete post"
        style={{
          // Add inline styles to make sure it's visible
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          background: 'rgba(255, 59, 48, 0.2)',
          border: '1px solid #ff3b30',
          borderRadius: '50%',
          padding: '8px',
          cursor: 'pointer',
          color: '#ff3b30'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => !isDeleting && setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Voice Drop?</h3>
            <p>This action cannot be undone. Your voice drop and all its comments will be permanently deleted.</p>
            
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="confirm-delete-btn"
                onClick={handleDelete}
                disabled={isDeleting}
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