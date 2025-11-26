"use client"

import React, { useState, useEffect } from 'react';
import { Heart, LogOut, Sparkles, Copy, Check, Loader, Plus, Archive, Trash2, ChevronDown, Menu, X, Edit2, FolderPlus } from 'lucide-react';
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
  updateDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';

interface User {
  email: string | null;
  id: string;
}

interface Notebook {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  color: string;
}

interface Page {
  id: string;
  title: string;
  content: string;
  notebookId: string;
  userId: string;
  timestamp: string;
  liked: boolean;
  archived: boolean;
}

export default function InspireApp() {
  const [user, setUser] = useState<User | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newNotebookName, setNewNotebookName] = useState('');
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500'];
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          email: currentUser.email,
          id: currentUser.uid
        });
        loadNotebooks(currentUser.uid);
      } else {
        setUser(null);
        setNotebooks([]);
        setPages([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load notebooks
  const loadNotebooks = (userId: string) => {
    const q = query(collection(db, 'notebooks'), where('userId', '==', userId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedNotebooks: Notebook[] = [];
      snapshot.forEach((doc) => {
        loadedNotebooks.push({
          id: doc.id,
          ...doc.data()
        } as Notebook);
      });
      setNotebooks(loadedNotebooks);
      if (loadedNotebooks.length > 0 && !selectedNotebook) {
        setSelectedNotebook(loadedNotebooks[0].id);
      }
    });

    return unsubscribe;
  };

  // Load pages for selected notebook
  useEffect(() => {
    if (selectedNotebook && user) {
      const q = query(
        collection(db, 'pages'),
        where('notebookId', '==', selectedNotebook),
        where('userId', '==', user.id)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedPages: Page[] = [];
        snapshot.forEach((doc) => {
          loadedPages.push({
            id: doc.id,
            ...doc.data()
          } as Page);
        });
        setPages(loadedPages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        if (selectedPage && !loadedPages.find(p => p.id === selectedPage)) {
          setSelectedPage(null);
          setPageContent('');
        }
      });

      return () => unsubscribe();
    }
  }, [selectedNotebook, user]);

  // Create notebook
  const createNotebook = async () => {
    if (!newNotebookName.trim() || !user) return;

    try {
      await addDoc(collection(db, 'notebooks'), {
        name: newNotebookName,
        userId: user.id,
        createdAt: new Date().toLocaleDateString(),
        color: selectedColor
      });
      setNewNotebookName('');
      setShowNewNotebook(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Create page
  const createPage = async () => {
    if (!newPageTitle.trim() || !selectedNotebook || !user) return;

    try {
      await addDoc(collection(db, 'pages'), {
        title: newPageTitle,
        content: pageContent,
        notebookId: selectedNotebook,
        userId: user.id,
        timestamp: new Date().toLocaleDateString(),
        liked: false,
        archived: false
      });
      setNewPageTitle('');
      setPageContent('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Select page and load content
  const selectPage = (page: Page) => {
    setSelectedPage(page.id);
    setPageContent(page.content);
    setEditingPageId(null);
  };

  // Save page content
  const savePage = async () => {
    if (!selectedPage || !user) return;

    try {
      await updateDoc(doc(db, 'pages', selectedPage), {
        content: pageContent
      });
      setEditingPageId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete page
  const deletePage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pages', id));
      if (selectedPage === id) {
        setSelectedPage(null);
        setPageContent('');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Archive page
  const archivePage = async (id: string, currentArchived: boolean) => {
    try {
      await updateDoc(doc(db, 'pages', id), {
        archived: !currentArchived
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Toggle like
  const toggleLike = async (id: string, currentLiked: boolean) => {
    try {
      await updateDoc(doc(db, 'pages', id), {
        liked: !currentLiked
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete notebook
  const deleteNotebook = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notebooks', id));
      if (selectedNotebook === id) {
        setSelectedNotebook(null);
        setSelectedPage(null);
        setPageContent('');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Auth functions
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied('content');
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
            <Sparkles className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" style={{animationDuration: '3s'}} />
            <h1 className={`text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Inspire</h1>
            <p className={darkMode ? 'text-purple-200' : 'text-purple-600'}>Capture your thoughts, fuel your creativity</p>
          </div>

          {!showAuthForm ? (
            <button
              onClick={() => setShowAuthForm(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Get Started
            </button>
          ) : (
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}>
              <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {authMode === 'login' ? 'Log In' : 'Sign Up'}
              </h2>
              {error && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded text-sm">{error}</div>}
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
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded mb-4"
              >
                {authLoading ? 'Loading...' : (authMode === 'login' ? 'Log In' : 'Sign Up')}
              </button>
              <button
                onClick={handleGoogleSignIn}
                className={`w-full py-2 rounded mb-4 flex items-center justify-center gap-2 ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200'}`}
              >
                🔵 Sign in with Google
              </button>
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className={`w-full py-2 text-sm ${darkMode ? 'text-purple-300' : 'text-purple-600'} hover:underline`}
              >
                {authMode === 'login' ? 'Create account' : 'Log in instead'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const filteredPages = showArchived 
    ? pages.filter(p => p.archived) 
    : pages.filter(p => !p.archived);

  const currentPage = pages.find(p => p.id === selectedPage);

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Left Sidebar - Notebooks */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ${darkMode ? 'bg-slate-800 border-r border-slate-700' : 'bg-white border-r border-gray-200'} flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 hover:bg-slate-700 rounded ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto ${sidebarOpen ? 'px-3' : 'px-0'}`}>
          {sidebarOpen && <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>NOTEBOOKS</p>}
          <div className="space-y-2">
            {notebooks.map((nb) => (
              <div key={nb.id} className="group">
                <button
                  onClick={() => setSelectedNotebook(nb.id)}
                  className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition ${
                    selectedNotebook === nb.id
                      ? darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                      : darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${nb.color}`}></div>
                  {sidebarOpen && <span className="truncate text-sm">{nb.name}</span>}
                </button>
                {sidebarOpen && selectedNotebook === nb.id && (
                  <button
                    onClick={() => deleteNotebook(nb.id)}
                    className={`w-full text-left px-3 py-1 text-xs rounded opacity-0 group-hover:opacity-100 ${darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-100'}`}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {sidebarOpen && (
          <div className="p-3 border-t border-slate-700">
            {!showNewNotebook ? (
              <button
                onClick={() => setShowNewNotebook(true)}
                className={`w-full px-3 py-2 rounded flex items-center gap-2 ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                <Plus className="w-4 h-4" />
                New Notebook
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Notebook name"
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  className={`w-full px-3 py-2 rounded text-sm border-2 ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300'}`}
                />
                <div className="flex gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-6 h-6 rounded-full ${color} ${selectedColor === color ? 'ring-2 ring-white' : ''}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createNotebook}
                    className="flex-1 px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewNotebook(false)}
                    className={`flex-1 px-3 py-1 rounded text-sm ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className={`${darkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-gray-200'} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Inspire</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        {selectedNotebook ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Pages List - Middle */}
            <div className={`w-64 ${darkMode ? 'bg-slate-800 border-r border-slate-700' : 'bg-gray-100 border-r border-gray-200'} flex flex-col overflow-hidden`}>
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pages</h2>
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`text-xs px-2 py-1 rounded ${showArchived ? 'bg-orange-500/20 text-orange-400' : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200'}`}
                  >
                    {showArchived ? 'Archived' : 'Active'}
                  </button>
                </div>
                <button
                  onClick={() => setNewPageTitle('')}
                  className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Page
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 p-2">
                {filteredPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => selectPage(page)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition truncate ${
                      selectedPage === page.id
                        ? darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                        : darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-200'
                    }`}
                  >
                    {page.title || 'Untitled'}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor - Right */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedPage && currentPage ? (
                <>
                  <div className={`${darkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white border-b border-gray-200'} px-6 py-4 flex items-center justify-between`}>
                    <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentPage.title}</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(pageContent)}
                        className={`p-2 rounded ${copied === 'content' ? 'bg-green-500/20 text-green-400' : darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200'}`}
                      >
                        {copied === 'content' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => toggleLike(selectedPage, currentPage.liked)}
                        className={`p-2 rounded ${currentPage.liked ? 'text-red-500' : darkMode ? 'text-slate-400 hover:text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                      >
                        <Heart className={`w-4 h-4 ${currentPage.liked ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => archivePage(selectedPage, currentPage.archived)}
                        className={`p-2 rounded ${currentPage.archived ? 'text-orange-500' : darkMode ? 'text-slate-400' : 'text-gray-500'}`}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePage(selectedPage)}
                        className={`p-2 rounded ${darkMode ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-100 text-red-600'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className={`flex-1 overflow-hidden ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} p-6`}>
                    {editingPageId === selectedPage ? (
                      <textarea
                        value={pageContent}
                        onChange={(e) => setPageContent(e.target.value)}
                        className={`w-full h-full px-4 py-3 rounded-lg border-2 resize-none focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                      />
                    ) : (
                      <div
                        onClick={() => setEditingPageId(selectedPage)}
                        className={`w-full h-full px-4 py-3 rounded-lg border-2 border-dashed cursor-text overflow-y-auto ${darkMode ? 'bg-slate-800 border-slate-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'}`}
                      >
                        {pageContent || 'Click to add content...'}
                      </div>
                    )}
                  </div>

                  {editingPageId === selectedPage && (
                    <div className={`${darkMode ? 'bg-slate-800 border-t border-slate-700' : 'bg-white border-t border-gray-200'} px-6 py-3 flex gap-2`}>
                      <button
                        onClick={savePage}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPageId(null)}
                        className={`px-4 py-2 rounded ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              ) : newPageTitle !== '' ? (
                <div className={`flex-1 flex flex-col ${darkMode ? 'bg-slate-900' : 'bg-gray-50'} p-6`}>
                  <input
                    type="text"
                    placeholder="Page title"
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    className={`px-4 py-2 mb-4 rounded border-2 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <textarea
                    placeholder="Start typing..."
                    value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 resize-none focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={createPage}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded"
                    >
                      Create Page
                    </button>
                    <button
                      onClick={() => setNewPageTitle('')}
                      className={`px-4 py-2 rounded ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200'}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`flex-1 flex items-center justify-center ${darkMode ? 'bg-slate-900 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                  <p>Select a page or create a new one</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`flex-1 flex items-center justify-center ${darkMode ? 'bg-slate-900 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
            <p>Create a notebook to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}