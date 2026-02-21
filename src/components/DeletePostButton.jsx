// DeletePostButton.jsx - UPDATED VERSION
// This version uses 'voicedrop_token' to match your app

import React, { useState } from 'react';
import './DeletePostButton.css';

const DeletePostButton = ({ postId, currentUsername, postUsername, onDeleteSuccess }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Only show delete button if user owns the post
  if (!currentUsername || currentUsername !== postUsername) {
    return null;
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem('voicedrop_token'); // ← Updated to use your token name
      
      const response = await fetch(`https://voicedrop-backend-99zl.onrender.com/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      // Call success callback
      if (onDeleteSuccess) {
        onDeleteSuccess(postId);
      }

      setShowConfirmModal(false);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button 
        className="delete-btn"
        onClick={() => setShowConfirmModal(true)}
        title="Delete post"
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