import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Heart, MessageCircle, Share2, TrendingUp, Clock, Sparkles, Users, Radio, Bookmark, LogOut, Trash2, Search, X } from 'lucide-react';
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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [authLoading, setAuthLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(!!localStorage.getItem('voicedrop_token'));
  const [serverWaking, setServerWaking] = useState(false);
  const [sortMode, setSortMode] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  //eslint-disable-next-line
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
      setPosts(prevPosts =>
        (Array.isArray(prevPosts) ? prevPosts : []).map(post =>
          post.id === postId ? { ...post, likes } : post
        )
      );
    });

    newSocket.on('newComment', ({ postId, comment }) => {
      setComments(prev => ({
        ...prev,
        [postId]: [comment, ...(prev[postId] || [])]
      }));
      setPosts(prevPosts =>
        (Array.isArray(prevPosts) ? prevPosts : []).map(post =>
          post.id === postId ? { ...post, comments: post.comments + 1 } : post
        )
      );
    });

    // Listen for post deletions
    newSocket.on('postDeleted', ({ postId }) => {
      console.log('🗑️ Post deleted:', postId);
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Check authentication and fetch data
  useEffect(() => {
    if (authToken) {
      getCurrentUser();
      fetchPosts(selectedCategory);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // Re-fetch when category or sort mode changes
  useEffect(() => {
    if (authToken && !isSearching) {
      setPosts([]);
      fetchPosts(selectedCategory, null, sortMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, sortMode]);

  const getCurrentUser = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => setServerWaking(true), 3000);

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        signal: controller.signal
      });

      clearTimeout(timeout);
      setServerWaking(false);

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      } else {
        localStorage.removeItem('voicedrop_token');
        setAuthToken(null);
        setCurrentUser(null);
      }
    } catch (error) {
      setServerWaking(false);
      console.error('Error getting current user:', error);
      localStorage.removeItem('voicedrop_token');
      setAuthToken(null);
      setCurrentUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const fetchPosts = async (category = 'all', cursor = null, sort = 'latest') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (cursor) params.set('cursor', cursor);
      if (sort !== 'latest') params.set('sort', sort);

      // Send token so server can personalize the feed based on engagement history
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await fetch(`${API_URL}/posts?${params}`, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const postsList = Array.isArray(data) ? data : (data.posts || []);
      setPosts(postsList);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchPosts = async (query) => {
    if (!query || query.trim().length < 2) {
      fetchPosts(selectedCategory, null, sortMode);
      return;
    }
    try {
      setLoading(true);
      setIsSearching(true);
      const response = await fetch(`${API_URL}/posts/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      setPosts(data.posts || []);
      setHasMore(false);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore || posts.length === 0) return;
    try {
      setLoadingMore(true);
      const lastPost = posts[posts.length - 1];
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      params.set('cursor', lastPost.createdAt);
      if (sortMode !== 'latest') params.set('sort', sortMode);

      const response = await fetch(`${API_URL}/posts?${params}`);
      const data = await response.json();
      setPosts(prev => [...(Array.isArray(prev) ? prev : []), ...(data.posts || [])]);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup';
      const body = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password, username: authForm.username };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setAuthError('Could not reach the server. Please try again in a moment.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('voicedrop_token');
    setAuthToken(null);
    setCurrentUser(null);
    setPosts([]);
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
        setPosts(prev => (Array.isArray(prev) ? prev : []).map(post => post.id === id ? data : post));
      }
    } catch (error) {
      console.error('Error liking post:', error);
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
      setPosts(prev => (Array.isArray(prev) ? prev : []).filter(post => post.id !== id));
      alert('Post deleted! ✅');
    }
  } catch (error) {
    console.error('Error deleting post:', error);
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
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

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

  
  

  // Show loading screen while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Mic className="w-10 h-10 text-black" />
          </div>
          {serverWaking ? (
            <>
              <p className="text-white font-medium mb-1">Waking up the server...</p>
              <p className="text-neutral-500 text-sm">Free tier goes to sleep — give it 30 seconds</p>
            </>
          ) : (
            <p className="text-neutral-400">Loading...</p>
          )}
        </div>
      </div>
    );
  }

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
                disabled={authLoading}
                className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-neutral-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {authLoading
                  ? (authMode === 'login' ? 'Logging in...' : 'Creating account...')
                  : (authMode === 'login' ? 'Login' : 'Create Account')
                }
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
                onClick={() => setShowProfile(false)}
                className="w-full bg-white text-black py-2 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {activeTab === 'feed' && (
          <>
            {/* Search bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search drops..."
                value={searchQuery}
                onChange={e => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val.trim().length === 0) {
                    setIsSearching(false);
                    fetchPosts(selectedCategory, null, sortMode);
                  }
                }}
                onKeyDown={e => { if (e.key === 'Enter') searchPosts(searchQuery); }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setIsSearching(false); fetchPosts(selectedCategory, null, sortMode); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort toggle + category pills */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 bg-neutral-900 rounded-lg p-1">
                <button
                  onClick={() => { setSortMode('latest'); setIsSearching(false); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortMode === 'latest' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
                >
                  Latest
                </button>
                <button
                  onClick={() => { setSortMode('top'); setIsSearching(false); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortMode === 'top' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
                >
                  Top
                </button>
              </div>
              {isSearching && (
                <span className="text-xs text-neutral-400">Results for "{searchQuery}"</span>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-5 mb-6 scrollbar-hide">
              {categories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setPosts([]); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      selectedCategory === cat.id ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {loading && (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 bg-neutral-800 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="flex justify-between">
                          <div className="space-y-1.5">
                            <div className="h-3 bg-neutral-800 rounded w-24" />
                            <div className="h-2.5 bg-neutral-800 rounded w-16" />
                          </div>
                          <div className="h-6 bg-neutral-800 rounded-full w-16" />
                        </div>
                        <div className="h-4 bg-neutral-800 rounded w-3/4" />
                        <div className="h-12 bg-neutral-800 rounded-xl" />
                        <div className="flex gap-6">
                          <div className="h-3 bg-neutral-800 rounded w-8" />
                          <div className="h-3 bg-neutral-800 rounded w-8" />
                          <div className="h-3 bg-neutral-800 rounded w-8" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && posts.length === 0 && (
              <div className="text-center py-16 text-neutral-400">
                <div className="text-4xl mb-3">🎤</div>
                <div className="font-medium text-neutral-300 mb-1">
                  {isSearching ? `No results for "${searchQuery}"` : 'No drops yet'}
                </div>
                <div className="text-sm">
                  {isSearching ? 'Try a different search term' : 'Be the first to drop your voice'}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {(Array.isArray(posts) ? posts : []).map(post => (
                <div
                  key={post.id}
                  className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                      {post.avatar || '🎭'}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{post.username}</span>
                          <span className="text-neutral-600 text-xs">·</span>
                          <span className="text-neutral-500 text-xs">{post.timestamp}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {post.status === 'processing' && (
                            <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                              Processing…
                            </span>
                          )}
                          <span className="text-xs bg-neutral-800 text-neutral-400 px-2.5 py-0.5 rounded-full capitalize">
                            {post.category}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-medium text-white mb-3 leading-snug">{post.title}</h3>

                      {/* Audio player */}
                      <div className="flex items-center gap-3 mb-3 bg-neutral-800/60 rounded-xl px-3 py-2.5">
                        <button
                          onClick={() => togglePlay(post.id, post.audioUrl)}
                          disabled={!post.audioUrl || post.status === 'processing'}
                          className="w-8 h-8 bg-white hover:bg-neutral-200 rounded-full flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {playingId === post.id
                            ? <Pause className="w-3.5 h-3.5 text-black" />
                            : <Play className="w-3.5 h-3.5 text-black ml-0.5" />
                          }
                        </button>
                        <div className="flex-1 flex items-end gap-px h-7">
                          {post.waveform?.map((height, i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-full transition-colors ${
                                playingId === post.id ? 'bg-white' : 'bg-neutral-600'
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-neutral-400 tabular-nums">{post.duration}</span>
                      </div>

                      {/* Transcript placeholder — Whisper fills this in Phase 10 */}
                      {post.transcript && (
                        <p className="text-xs text-neutral-400 italic mb-3 leading-relaxed line-clamp-2">
                          "{post.transcript}"
                        </p>
                      )}

                      {/* Action bar */}
                      <div className="flex items-center gap-5">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1.5 transition-colors ${
                            currentUser?.likedPosts?.includes(post.id)
                              ? 'text-red-400'
                              : 'text-neutral-500 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${currentUser?.likedPosts?.includes(post.id) ? 'fill-current' : ''}`} />
                          <span className="text-xs font-medium">{post.likes?.toLocaleString() || 0}</span>
                        </button>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">{post.comments || 0}</span>
                        </button>
                        <button
                          onClick={() => handleSave(post.id)}
                          className={`flex items-center gap-1.5 transition-colors ${
                            currentUser?.savedPosts?.includes(post.id) ? 'text-yellow-400' : 'text-neutral-500 hover:text-white'
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${currentUser?.savedPosts?.includes(post.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button className="flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors ml-auto">
                          <Share2 className="w-4 h-4" />
                        </button>
                        {currentUser?.username === post.username && (
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="flex items-center gap-1.5 text-neutral-600 hover:text-red-400 transition-colors"
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
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  postComment(post.id);
                                }
                              }}
                              placeholder="Add a comment..."
                              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                            />
                            <button
                              onClick={() => postComment(post.id)}
                              className="bg-white text-black px-3 py-2 rounded-lg font-medium hover:bg-neutral-200 transition-colors"
                            >
                              Send
                            </button>
                          </div>

                          <div className="mt-3 space-y-3">
                            {(comments[post.id] || []).map((c) => (
                              <div key={c.id || c._id} className="bg-neutral-800 p-3 rounded-lg">
                                <div className="text-xs text-neutral-400">{c.username}</div>
                                <div className="text-sm text-white">{c.text}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  className="bg-neutral-800 text-neutral-300 hover:bg-neutral-700 px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'record' && (
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <h2 className="text-base font-semibold text-white mb-5">New Voice Drop</h2>

            {/* Record button */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <button
                onClick={toggleRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isRecording
                    ? 'bg-red-500 scale-110 shadow-red-500/30'
                    : 'bg-white hover:bg-neutral-200'
                }`}
              >
                <Mic className={`w-8 h-8 ${isRecording ? 'text-white' : 'text-black'}`} />
              </button>
              <div className="text-center">
                <div className={`text-xl font-mono font-bold tabular-nums ${isRecording ? 'text-red-400' : 'text-white'}`}>
                  {formatTime(recordingTime)}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {isRecording ? 'Recording… tap to stop' : recordedAudio ? 'Recording ready' : 'Tap to start recording'}
                </div>
              </div>
            </div>

            {/* Playback */}
            {recordedAudio && (
              <div className="flex items-center gap-3 mb-5 bg-neutral-800 rounded-xl p-3">
                <audio controls src={recordedAudio.url} className="flex-1 h-8" style={{ filter: 'invert(1)' }} />
                <button
                  onClick={deleteRecording}
                  className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Post form */}
            <div className="space-y-3">
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Give your drop a title…"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
              />
              <select
                value={newPostCategory}
                onChange={(e) => setNewPostCategory(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neutral-500 transition-colors"
              >
                <option value="">Select a category</option>
                {categories.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={postVoiceDrop}
                disabled={posting || !recordedAudio || !newPostTitle || !newPostCategory}
                className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {posting ? 'Posting…' : 'Drop it'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceDropApp;