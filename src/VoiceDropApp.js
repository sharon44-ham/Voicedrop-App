import React, { useState, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Heart, MessageCircle, Share2, TrendingUp, Clock, Sparkles, Users, Radio, Bookmark, LogOut } from 'lucide-react';
import io from 'socket.io-client';
import DeletePostButton from './components/DeletePostButton';

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
  const [isCheckingAuth, setIsCheckingAuth] = useState(!!localStorage.getItem('voicedrop_token'));

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
      fetchPosts();
    } else {
      setLoading(false);
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
        console.log('❌ Invalid token, logging out');
        localStorage.removeItem('voicedrop_token');
        setAuthToken(null);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      localStorage.removeItem('voicedrop_token');
      setAuthToken(null);
      setCurrentUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/posts`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
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

  // Handle delete success callback
  const handleDeleteSuccess = (deletedPostId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
    console.log('✅ Post deleted successfully:', deletedPostId);
  };

  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

  // Show loading screen while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Mic className="w-10 h-10 text-black" />
          </div>
          <p className="text-neutral-400">Loading...</p>
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
                  className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 hover:border-neutral-700 transition-all relative"
                >
                  {/* DELETE BUTTON - Only shows on user's own posts */}
                  <DeletePostButton
                    postId={post.id}
                    currentUsername={currentUser?.username}
                    postUsername={post.username}
                    onDeleteSuccess={handleDeleteSuccess}
                  />

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
                          {post.waveform?.map((height, i) => (
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
                          className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
                        >
                          <Heart className="w-4 h-4" />
                          <span className="text-xs font-medium">{post.likes?.toLocaleString() || 0}</span>
                        </button>
                        <button 
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">{post.comments || 0}</span>
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
          </>
        )}

        {activeTab === 'record' && (
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={toggleRecording}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500' : 'bg-white'}`}
                title="Record"
              >
                <Mic className={`w-6 h-6 ${isRecording ? 'text-white' : 'text-black'}`} />
              </button>
              <div>
                <div className="text-sm text-neutral-400">Recording time</div>
                <div className="font-medium text-white">{formatTime(recordingTime)}</div>
              </div>
            </div>

            {recordedAudio ? (
              <div className="flex items-center gap-3">
                <audio controls src={recordedAudio.url} className="w-full" />
                <button onClick={deleteRecording} className="px-3 py-2 bg-neutral-800 rounded-lg">Delete</button>
              </div>
            ) : (
              <div className="text-sm text-neutral-500">No recording yet — press the button to start.</div>
            )}

            <div className="mt-6">
              <input
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Title for your voice drop"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none"
              />
              <div className="mt-3 flex gap-2">
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Select category</option>
                  {categories.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button onClick={postVoiceDrop} disabled={posting} className="bg-white text-black px-4 py-2 rounded-lg">
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceDropApp;