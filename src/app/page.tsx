"use client"

import React, { useState, useEffect } from 'react';
import { Heart, LogOut, Sparkles, Copy, Check, Loader } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase';

interface User {
  email: string | null;
  id: string;
}

interface Note {
  id: string;
  text: string;
  timestamp: string;
  liked: boolean;
  userId: string;
}

export default function InspireApp() {
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          email: currentUser.email,
          id: currentUser.uid
        });
        loadNotes(currentUser.uid);
      } else {
        setUser(null);
        setNotes([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load notes from Firestore
  const loadNotes = (userId: string) => {
    const q = query(collection(db, 'notes'), where('userId', '==', userId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedNotes: Note[] = [];
      snapshot.forEach((doc) => {
        loadedNotes.push({
          id: doc.id,
          ...doc.data()
        } as Note);
      });
      setNotes(loadedNotes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    return unsubscribe;
  };

  // Email/Password Sign Up
  const handleSignUp = async () => {
    if (!authEmail || !authPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    setAuthLoading(true);
    setError('');
    
    try {
      await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
      setShowAuthForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Email/Password Login
  const handleLogin = async () => {
    if (!authEmail || !authPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    setAuthLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
      setShowAuthForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add Note
  const addNote = async () => {
    if (!newNote.trim() || !user) return;

    try {
      await addDoc(collection(db, 'notes'), {
        text: newNote,
        timestamp: new Date().toLocaleDateString(),
        liked: false,
        userId: user.id
      });
      setNewNote('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete Note
  const deleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Toggle Like
  const toggleLike = async (id: string, currentLiked: boolean) => {
    try {
      await updateDoc(doc(db, 'notes', id), {
        liked: !currentLiked
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Save Edit
  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;

    try {
      await updateDoc(doc(db, 'notes', id), {
        text: editText
      });
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
        <Loader className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
        <div className="w-full max-w-md mx-4">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Sparkles className="w-12 h-12 text-purple-400 animate-spin" style={{animationDuration: '3s'}} />
            </div>
            <h1 className={`text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Inspire
            </h1>
            <p className={darkMode ? 'text-purple-200' : 'text-purple-600'}>
              Capture your thoughts, fuel your creativity
            </p>
          </div>

          {!showAuthForm ? (
            <button
              onClick={() => setShowAuthForm(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105"
            >
              Get Started
            </button>
          ) : (
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}>
              <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {authMode === 'login' ? 'Log In' : 'Sign Up'}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded text-sm">
                  {error}
                </div>
              )}

              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className={`w-full px-4 py-2 mb-4 rounded border-2 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300'} focus:outline-none focus:border-purple-500`}
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className={`w-full px-4 py-2 mb-6 rounded border-2 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300'} focus:outline-none focus:border-purple-500`}
              />
              <button
                onClick={authMode === 'login' ? handleLogin : handleSignUp}
                disabled={authLoading}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded mb-4 transition disabled:opacity-50"
              >
                {authLoading ? 'Loading...' : (authMode === 'login' ? 'Log In' : 'Sign Up')}
              </button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${darkMode ? 'border-slate-600' : 'border-gray-300'}`}></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-2 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-gray-500'}`}>Or</span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className={`w-full py-2 rounded mb-4 transition disabled:opacity-50 flex items-center justify-center gap-2 ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                <span>🔵</span> Sign in with Google
              </button>

              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className={`w-full py-2 text-sm ${darkMode ? 'text-purple-300 hover:text-purple-200' : 'text-purple-600 hover:text-purple-700'} hover:underline`}
              >
                {authMode === 'login' ? 'Create account' : 'Log in instead'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50'} border-b backdrop-blur-md sticky top-0 z-50`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Inspire</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-yellow-400' : 'bg-gray-200 text-gray-800'}`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <div className={`mb-8 p-6 rounded-xl ${darkMode ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30' : 'bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200'}`}>
          <p className={darkMode ? 'text-purple-100' : 'text-purple-900'}>
            Welcome back, <span className="font-semibold">{user.email?.split('@')[0]}</span>! ✨
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 text-red-400 rounded">
            {error}
          </div>
        )}

        {/* Input Section */}
        <div className={`mb-8 p-6 rounded-xl ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/50 border border-gray-200'}`}>
          <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Capture Your Inspiration
          </label>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="What's inspiring you today? Write freely..."
            className={`w-full px-4 py-3 rounded-lg border-2 mb-4 resize-none focus:outline-none transition ${darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-purple-500' : 'bg-gray-100 border-gray-300 placeholder-gray-500 focus:border-purple-500'}`}
            rows={4}
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Inspiration
          </button>
        </div>

        {/* Notes Grid */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className={`text-center py-16 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No inspirations yet. Start writing to capture your thoughts!</p>
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                className={`p-6 rounded-lg transition transform hover:scale-102 ${darkMode ? 'bg-slate-800/50 border border-slate-700 hover:border-purple-500' : 'bg-white/50 border border-gray-200 hover:border-purple-400'}`}
              >
                {editingId === note.id ? (
                  <>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border-2 mb-4 resize-none focus:outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300'}`}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(note.id)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className={`flex-1 py-2 rounded transition ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={`mb-4 leading-relaxed ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                      {note.text}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                        {note.timestamp}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(note.text, note.id)}
                          className={`p-2 rounded transition ${copied === note.id ? 'bg-green-500/20 text-green-400' : darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
                          title="Copy"
                        >
                          {copied === note.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(note.id);
                            setEditText(note.text);
                          }}
                          className={`p-2 rounded transition ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => toggleLike(note.id, note.liked)}
                          className={`p-2 rounded transition ${note.liked ? 'text-red-500' : darkMode ? 'text-slate-400 hover:text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                        >
                          <Heart className={`w-4 h-4 ${note.liked ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className={`p-2 rounded transition ${darkMode ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-100 text-gray-500 hover:text-red-500'}`}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}