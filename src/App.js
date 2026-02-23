import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Heart, MessageCircle, Share2, TrendingUp, Clock, Sparkles, ChevronDown, StopCircle, Users, Radio, Bookmark, LogOut, Trash2 } from 'lucide-react';
import io from 'socket.io-client';
const API_URL = 'https://voicedrop-backend-99zl.onrender.com/api';
const SOCKET_URL = 'https://voicedrop-backend-99zl.onrender.com';

const VoiceDropApp = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('feed');
  const [playingId, setPlayingId] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [recordingUsers, setRecordingUsers] = useState(0);
  const [socket, setSocket] = useState(null);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem('voicedrop_token'));
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' });
  const [authError, setAuthError] = useState('');
  //eslint-disable-next-line
  const [savedPosts, setSavedPosts] = useState([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
const [editForm, setEditForm] = useState({ username: '', bio: '', avatar: '' });
const [viewingUser, setViewingUser] = useState(null);
const [viewingUserPosts, setViewingUserPosts] = useState([]);
const [loadingUserProfile, setLoadingUserProfile] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const audioPlayerRefs = useRef({});

  const categories = [
    { id: 'all', name: 'For You', icon: Sparkles },
    { id: 'tedtalk', name: 'Talks', icon: TrendingUp },
    { id: 'philosophy', name: 'Philosophy', icon: MessageCircle },
    { id: 'humor', name: 'Humor', icon: Heart },
    { id: 'gyaan', name: 'Gyaan', icon: Clock }
  ];

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('onlineCount', (count) => {
      setOnlineUsers(count);
    });

    newSocket.on('recordingCount', (count) => {
      setRecordingUsers(count);
    });

    newSocket.on('newPost', (post) => {
      console.log('📢 New post received:', post);
      setPosts(prevPosts => [post, ...prevPosts]);
    });

    newSocket.on('likeUpdate', ({ postId, likes }) => {
      console.log('💖 Like update received:', postId, likes);
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId ? { ...post, likes } : post
        )
      );
    });

    newSocket.on('newComment', ({ postId, comment }) => {
      console.log('💬 New comment received:', comment);
      setComments(prev => ({
        ...prev,
        [postId]: [comment, ...(prev[postId] || [])]
      }));
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId ? { ...post, comments: post.comments + 1 } : post
        )
      );
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Check authentication and fetch data
  useEffect(() => {
    if (authToken) {
      getCurrentUser();
      fetchPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const getCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        console.log('👤 Logged in as:', userData.username);
      } else {
        // Token invalid, clear it
        localStorage.removeItem('voicedrop_token');
        setAuthToken(null);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/posts`);
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup';
      const body = authMode === 'login' 
        ? { email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password, username: authForm.username };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('voicedrop_token', data.token);
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setAuthForm({ email: '', password: '', username: '' });
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError('Something went wrong. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('voicedrop_token');
    setAuthToken(null);
    setCurrentUser(null);
    setPosts([]);
  };
const handleUpdateProfile = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(editForm)
    });

    const data = await response.json();

    if (response.ok) {
      setCurrentUser(data.user);
      setShowEditProfile(false);
      alert('Profile updated! ✅');
      fetchPosts();
    } else {
      alert(data.error || 'Failed to update profile');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    alert('Failed to update profile');
  }
};

const fetchUserProfile = async (username) => {
  try {
    setLoadingUserProfile(true);
    const response = await fetch(`${API_URL}/users/${username}`);
    
    if (response.ok) {
      const data = await response.json();
      setViewingUser(data.user);
      setViewingUserPosts(data.posts);
    } else {
      alert('User not found');
      setViewingUser(null);
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    alert('Failed to load user profile');
  } finally {
    setLoadingUserProfile(false);
  }
};

useEffect(() => {
  if (isRecording) {
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 300) {
            if (mediaRecorderRef.current) {
              mediaRecorderRef.current.stop();
              setIsRecording(false);
            }
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio({ blob: audioBlob, url: audioUrl });
        stream.getTracks().forEach(track => track.stop());
        
        if (socket) {
          socket.emit('stopRecording');
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      if (socket) {
        socket.emit('startRecording');
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Unable to access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const togglePlay = (id, audioUrl) => {
    if (playingId === id) {
      if (audioPlayerRefs.current[id]) {
        audioPlayerRefs.current[id].pause();
      }
      setPlayingId(null);
    } else {
      if (playingId && audioPlayerRefs.current[playingId]) {
        audioPlayerRefs.current[playingId].pause();
      }
      
      if (!audioPlayerRefs.current[id]) {
        audioPlayerRefs.current[id] = new Audio(audioUrl);
        audioPlayerRefs.current[id].onended = () => {
          setPlayingId(null);
        };
      }
      
      audioPlayerRefs.current[id].play().catch(err => {
        console.error('Error playing audio:', err);
        alert('Failed to play audio. The URL might have expired.');
      });
      
      setPlayingId(id);
    }
  };

 const handleLike = async (id) => {
    if (!authToken) {
      alert('Please login to like posts');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/posts/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(posts.map(post => post.id === id ? data : post));
        
        // Update currentUser's likedPosts
        setCurrentUser(prev => {
          const isLiked = prev.likedPosts?.includes(id);
          return {
            ...prev,
            likedPosts: isLiked 
              ? prev.likedPosts.filter(postId => postId !== id)
              : [...(prev.likedPosts || []), id]
          };
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };
  

  const handleSave = async (id) => {
    if (!authToken) {
      alert('Please login to save posts');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/posts/${id}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(prev => ({ ...prev, savedPosts: data.savedPosts }));
        
        // Update saved posts list if on saved tab
        if (activeTab === 'saved') {
          fetchSavedPosts();
        }
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };
const handleDelete = async (id) => {
    if (!authToken) {
      alert('Please login to delete posts');
      return;
    }

    if (!window.confirm('Delete this post? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setPosts(posts.filter(post => post.id !== id));
        alert('Post deleted! ✅');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };
  const fetchSavedPosts = async () => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_URL}/posts/saved`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedPosts(data);
      }
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    }
  };

  // Fetch saved posts when switching to saved tab
  useEffect(() => {
    if (activeTab === 'saved' && authToken) {
      fetchSavedPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authToken]);

  const postVoiceDrop = async () => {
    if (!newPostTitle.trim() || !newPostCategory || !recordedAudio) {
      alert('Please add a title, category, and record audio before posting');
      return;
    }

    if (!authToken) {
      alert('Please login to post');
      return;
    }

    try {
      setPosting(true);
      
      const formData = new FormData();
      formData.append('audio', recordedAudio.blob, 'recording.wav');
      formData.append('title', newPostTitle);
      formData.append('category', newPostCategory);
      formData.append('duration', formatTime(recordingTime));

      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      if (response.ok) {
        setNewPostTitle('');
        setNewPostCategory('');
        setRecordedAudio(null);
        setRecordingTime(0);
        setActiveTab('feed');
        alert('Voice drop posted successfully! 🎉');
      } else {
        alert('Failed to post. Please try again.');
      }
    } catch (error) {
      console.error('Error posting:', error);
      alert('Failed to post. Make sure backend is running.');
    } finally {
      setPosting(false);
    }
  };

  const deleteRecording = () => {
    if (recordedAudio) {
      URL.revokeObjectURL(recordedAudio.url);
    }
    setRecordedAudio(null);
    setRecordingTime(0);
  };

  const toggleComments = async (postId) => {
    if (expandedComments.has(postId)) {
      setExpandedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      setExpandedComments(prev => new Set([...prev, postId]));
      
      if (!comments[postId]) {
        try {
          const response = await fetch(`${API_URL}/posts/${postId}/comments`);
          const data = await response.json();
          setComments(prev => ({ ...prev, [postId]: data }));
        } catch (error) {
          console.error('Error fetching comments:', error);
        }
      }
    }
  };

  const postComment = async (postId) => {
    const commentText = newComment[postId];
    if (!commentText || !commentText.trim()) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          text: commentText,
          username: currentUser?.username || 'Anonymous'
        })
      });

      if (response.ok) {
        setNewComment(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

  // If not authenticated, show login/signup
  if (!authToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mic className="w-10 h-10 text-black" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">VoiceDrop</h1>
            <p className="text-neutral-400">Anonymous voice social platform</p>
          </div>

          <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 px-4 rounded-lg transition-all font-medium ${
                  authMode === 'login'
                    ? 'bg-white text-black'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 px-4 rounded-lg transition-all font-medium ${
                  authMode === 'signup'
                    ? 'bg-white text-black'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth}>
              {authMode === 'signup' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">Username</label>
                  <input
                    type="text"
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    placeholder="Choose a username"
                    required
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white text-white placeholder:text-neutral-500"
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">Email</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white text-white placeholder:text-neutral-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-300 mb-2">Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white text-white placeholder:text-neutral-500"
                />
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
              >
                {authMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main app (authenticated)
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                <Mic className="w-4 h-4 text-black" />
              </div>
              <h1 className="text-xl font-semibold text-white">
                VoiceDrop
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Users className="w-4 h-4" />
                <span>{onlineUsers} online</span>
              </div>
              {recordingUsers > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-400 animate-pulse">
                  <Radio className="w-4 h-4" />
                  <span>{recordingUsers} recording</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-neutral-400 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-neutral-700 transition-colors"
                   onClick={() => setShowProfile(!showProfile)}>
                <span className="text-sm">{currentUser?.avatar || '🎭'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

     {/* Navigation Tabs */}
      <div className="bg-neutral-900 border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('feed')}
              className={`py-4 px-1 relative transition-colors ${
                activeTab === 'feed' 
                  ? 'text-white font-medium' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Feed
              {activeTab === 'feed' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`py-4 px-1 relative transition-colors ${
                activeTab === 'record' 
                  ? 'text-white font-medium' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Record
              {activeTab === 'record' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`py-4 px-1 relative transition-colors ${
                activeTab === 'saved' 
                  ? 'text-white font-medium' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Saved
              {activeTab === 'saved' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Profile Modal */}
        {showProfile && currentUser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowProfile(false)}>
            <div className="bg-neutral-900 rounded-2xl p-6 max-w-md w-full border border-neutral-800" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center text-3xl">
                  {currentUser.avatar}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{currentUser.username}</h2>
                  <p className="text-sm text-neutral-400">{currentUser.email}</p>
                  <p className="text-xs text-neutral-500 mt-1">{currentUser.bio}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-neutral-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{currentUser.totalPosts}</div>
                  <div className="text-xs text-neutral-400">Posts</div>
                </div>
                <div className="bg-neutral-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{currentUser.totalLikes}</div>
                  <div className="text-xs text-neutral-400">Total Likes</div>
                </div>
              </div>

             <button
  onClick={() => {
    setEditForm({
      username: currentUser.username,
      bio: currentUser.bio || '',
      avatar: currentUser.avatar || '🎭'
    });
    setShowProfile(false);
    setShowEditProfile(true);
  }}
  className="w-full bg-neutral-800 text-white py-2 rounded-lg font-medium hover:bg-neutral-700 transition-colors mb-2"
>
  Edit Profile
</button>

<button
  onClick={() => setShowProfile(false)}
  className="w-full bg-white text-black py-2 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
>
  Close
</button>
            </div>
          </div>
        )}
{showEditProfile && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditProfile(false)}>
    <div className="bg-neutral-900 rounded-2xl p-6 max-w-md w-full border border-neutral-800" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-2xl font-semibold text-white mb-6">Edit Profile</h2>
      
      <form onSubmit={handleUpdateProfile}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-300 mb-2">Avatar (Emoji)</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center text-3xl">
              {editForm.avatar}
            </div>
            <input
              type="text"
              value={editForm.avatar}
              onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
              placeholder="🎭"
              maxLength={2}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white text-white placeholder:text-neutral-500"
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">Choose any emoji</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-300 mb-2">Username</label>
          <input
            type="text"
            value={editForm.username}
            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
            placeholder="Your username"
            required
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white text-white placeholder:text-neutral-500"
          />
          <p className="text-xs text-neutral-500 mt-1">This will update across all your posts</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-300 mb-2">Bio</label>
          <textarea
            value={editForm.bio}
            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            maxLength={150}
            rows={3}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white text-white placeholder:text-neutral-500 resize-none"
          />
          <p className="text-xs text-neutral-500 mt-1">{editForm.bio.length}/150 characters</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowEditProfile(false)}
            className="flex-1 bg-neutral-800 text-white py-2 rounded-lg font-medium hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-white text-black py-2 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* User Profile Modal */}
{viewingUser && (
  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-neutral-900 rounded-2xl max-w-2xl w-full border border-neutral-800 my-8">
      <div className="p-6 border-b border-neutral-800">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center text-4xl">
              {viewingUser.avatar}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">{viewingUser.username}</h2>
              <p className="text-sm text-neutral-400 mt-1">{viewingUser.bio}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setViewingUser(null);
              setViewingUserPosts([]);
            }}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-800 rounded-lg p-3">
            <div className="text-xl font-bold text-white">{viewingUser.totalPosts}</div>
            <div className="text-xs text-neutral-400">Posts</div>
          </div>
          <div className="bg-neutral-800 rounded-lg p-3">
            <div className="text-xl font-bold text-white">{viewingUser.totalLikes}</div>
            <div className="text-xs text-neutral-400">Total Likes</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Posts by {viewingUser.username}
        </h3>
        
        {loadingUserProfile ? (
          <div className="text-center py-8 text-neutral-400">Loading posts...</div>
        ) : viewingUserPosts.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">No posts yet</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {viewingUserPosts.map(post => (
              <div key={post.id} className="bg-neutral-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white">{post.title}</h4>
                  <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-1 rounded-full">
                    {post.category}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => togglePlay(post.id, post.audioUrl)}
                    className="w-8 h-8 bg-white rounded-full flex items-center justify-center"
                  >
                    {playingId === post.id ? (
                      <Pause className="w-3 h-3 text-black" />
                    ) : (
                      <Play className="w-3 h-3 text-black ml-0.5" />
                    )}
                  </button>
                  
                  <div className="flex-1 flex items-center gap-0.5 h-6">
                    {post.waveform.map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full bg-neutral-600"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  
                  <span className="text-xs text-neutral-400">{post.duration}</span>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                  <span>❤️ {post.likes}</span>
                  <span>💬 {post.comments}</span>
                  <span>{post.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}

        {activeTab === 'feed' && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-5 mb-6 scrollbar-hide">
              {categories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-sm ${
                      selectedCategory === cat.id
                        ? 'bg-white text-black'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {loading && (
              <div className="text-center py-12 text-neutral-400">
                Loading posts...
              </div>
            )}

            {!loading && filteredPosts.length === 0 && (
              <div className="text-center py-12 text-neutral-400">
                No posts yet. Be the first to drop your voice! 🎤
              </div>
            )}

            <div className="space-y-3">
              {filteredPosts.map(post => (
                <div 
                  key={post.id}
                  className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🎭</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
<div 
  className="font-medium text-white text-sm cursor-pointer hover:underline"
  onClick={(e) => {
    e.stopPropagation();
    fetchUserProfile(post.username);
  }}
>
  {post.username}
</div>                          <div className="text-xs text-neutral-500">{post.timestamp}</div>
                        </div>
                        <span className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
                          {post.category}
                        </span>
                      </div>
                      
                      <h3 className="text-base font-medium text-white mb-4 leading-snug">{post.title}</h3>
                      
                      <div className="flex items-center gap-3 mb-4 bg-neutral-800 rounded-xl p-3">
                        <button
                          onClick={() => togglePlay(post.id, post.audioUrl)}
                          disabled={!post.audioUrl}
                          className="w-9 h-9 bg-white hover:bg-neutral-200 rounded-full flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {playingId === post.id ? (
                            <Pause className="w-4 h-4 text-black" />
                          ) : (
                            <Play className="w-4 h-4 text-black ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1 flex items-center gap-1 h-8">
                          {post.waveform.map((height, i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-full transition-all ${
                                playingId === post.id ? 'bg-neutral-400' : 'bg-neutral-600'
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-neutral-400 font-medium tabular-nums">{post.duration}</span>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1.5 transition-colors ${
                            currentUser?.likedPosts?.includes(post.id)
                              ? 'text-red-500'
                              : 'text-neutral-400 hover:text-red-400'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${currentUser?.likedPosts?.includes(post.id) ? 'fill-current' : ''}`} />
                          <span className="text-xs font-medium">{post.likes.toLocaleString()}</span>
                        </button>
                        <button 
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">{post.comments}</span>
                        </button>
                        <button 
                          onClick={() => handleSave(post.id)}
                          className={`flex items-center gap-1.5 transition-colors ${
                            currentUser?.savedPosts?.includes(post.id)
                              ? 'text-yellow-400'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${currentUser?.savedPosts?.includes(post.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                        
                        {currentUser?.username === post.username && (
                          <button 
                            onClick={() => handleDelete(post.id)}
                            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors"
                            title="Delete post"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {expandedComments.has(post.id) && (
                        <div className="mt-4 pt-4 border-t border-neutral-700">
                          <div className="flex gap-2 mb-4">
                            <input
                              type="text"
                              value={newComment[post.id] || ''}
                              onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyPress={(e) => e.key === 'Enter' && postComment(post.id)}
                              placeholder="Add a comment..."
className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white text-white placeholder:text-neutral-500"
                            />
                            <button
                              onClick={() => postComment(post.id)}
                              disabled={!newComment[post.id]?.trim()}
                              className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Post
                            </button>
                          </div>

                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {comments[post.id]?.length > 0 ? (
                              comments[post.id].map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                  <div className="w-8 h-8 bg-neutral-700 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs">🎭</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium text-white">{comment.username}</span>
                                      <span className="text-xs text-neutral-500">{comment.timestamp}</span>
                                    </div>
                                    <p className="text-sm text-neutral-300">{comment.text}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-neutral-500 text-center py-4">No comments yet. Be the first!</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'saved' && (
          <>
            <h2 className="text-2xl font-semibold mb-6 text-white">Saved Posts</h2>
            
            {savedPosts.length === 0 ? (
              <div className="text-center py-12 text-neutral-400">
                No saved posts yet. Bookmark posts to save them! 🔖
              </div>
            ) : (
              <div className="space-y-3">
                {savedPosts.map(post => (
                  <div 
                    key={post.id}
                    className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 hover:border-neutral-700 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">🎭</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium text-white text-sm">{post.username}</div>
                            <div className="text-xs text-neutral-500">{post.timestamp}</div>
                          </div>
                          <span className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
                            {post.category}
                          </span>
                        </div>
                        
                        <h3 className="text-base font-medium text-white mb-4 leading-snug">{post.title}</h3>
                        
                        <div className="flex items-center gap-3 mb-4 bg-neutral-800 rounded-xl p-3">
                          <button
                            onClick={() => togglePlay(post.id, post.audioUrl)}
                            disabled={!post.audioUrl}
                            className="w-9 h-9 bg-white hover:bg-neutral-200 rounded-full flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {playingId === post.id ? (
                              <Pause className="w-4 h-4 text-black" />
                            ) : (
                              <Play className="w-4 h-4 text-black ml-0.5" />
                            )}
                          </button>
                          <div className="flex-1 flex items-center gap-1 h-8">
                            {post.waveform.map((height, i) => (
                              <div
                                key={i}
                                className={`flex-1 rounded-full transition-all ${
                                  playingId === post.id ? 'bg-neutral-400' : 'bg-neutral-600'
                                }`}
                                style={{ height: `${height}%` }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-neutral-400 font-medium tabular-nums">{post.duration}</span>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1.5 transition-colors ${
                              currentUser?.likedPosts?.includes(post.id)
                                ? 'text-red-500'
                                : 'text-neutral-400 hover:text-red-400'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${currentUser?.likedPosts?.includes(post.id) ? 'fill-current' : ''}`} />
                            <span className="text-xs font-medium">{post.likes.toLocaleString()}</span>
                          </button>
                          <button 
                            onClick={() => handleSave(post.id)}
                            className="flex items-center gap-1.5 text-yellow-400 transition-colors"
                          >
                            <Bookmark className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {activeTab === 'record' && (
          <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800 max-w-xl mx-auto">
            <h2 className="text-2xl font-semibold mb-8 text-white">Create a voice drop</h2>
            
            <div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-neutral-300 mb-2">Title</label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Give your voice drop a title..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-white placeholder:text-neutral-500"
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-neutral-300 mb-2">Category</label>
                <div className="relative">
                  <select 
                    value={newPostCategory}
                    onChange={(e) => setNewPostCategory(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-white appearance-none"
                  >
                    <option value="">Select a category</option>
                    <option value="tedtalk">TED Talk</option>
                    <option value="philosophy">Philosophy</option>
                    <option value="humor">Humor</option>
                    <option value="gyaan">Gyaan</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 py-8 bg-neutral-800 rounded-xl">
                {recordedAudio ? (
                  <>
                    <div className="w-full px-6">
                      <audio 
                        ref={audioRef}
                        src={recordedAudio.url} 
                        controls 
                        className="w-full"
                        style={{
                          filter: 'invert(1) hue-rotate(180deg)',
                        }}
                      />
                    </div>
                    <div className="text-neutral-300 font-medium">
                      Recording: {formatTime(recordingTime)}
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={deleteRecording}
                        disabled={posting}
                        className="bg-neutral-700 text-white px-5 py-2.5 rounded-lg hover:bg-neutral-600 transition-all font-medium text-sm disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button 
                        onClick={postVoiceDrop}
                        disabled={posting}
                        className="bg-white text-black px-6 py-2.5 rounded-lg hover:bg-neutral-200 transition-all font-medium text-sm disabled:opacity-50"
                      >
                        {posting ? 'Posting...' : 'Post Voice Drop'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                      isRecording 
                        ? 'bg-red-600 shadow-lg shadow-red-900/50 animate-pulse' 
                        : 'bg-white'
                    }`}>
                      <button
                        onClick={toggleRecording}
                        className="w-full h-full rounded-full flex items-center justify-center hover:scale-95 transition-transform"
                      >
                        {isRecording ? (
                          <StopCircle className="w-8 h-8 text-white" />
                        ) : (
                          <Mic className="w-8 h-8 text-black" />
                        )}
                      </button>
                    </div>
                    
                    {isRecording && (
                      <div className="text-xl font-medium text-white tabular-nums">
                        {formatTime(recordingTime)}
                      </div>
                    )}

                    <div className="text-center">
                      <div className="text-neutral-200 mb-1 font-medium">
                        {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
                      </div>
                      <div className="text-sm text-neutral-400">
                        Max duration: 5 minutes
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default VoiceDropApp;