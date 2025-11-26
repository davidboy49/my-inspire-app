"use client"

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Heart, LogOut, Sparkles, Copy, Check, Loader, Plus, Archive, Trash2, Menu, X } from 'lucide-react';
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
  displayName: string;
  photoURL: string | null;
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
  highlightType?: 'todo' | 'notTodo' | 'none';
  numbered?: boolean;
}

export default function InspireApp() {
  const [user, setUser] = useState<User | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [renamingNotebookId, setRenamingNotebookId] = useState<string | null>(null);
  const [renamingNotebookName, setRenamingNotebookName] = useState('');
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renamingPageTitle, setRenamingPageTitle] = useState('');

  const [theme, setTheme] = useState<'light' | 'dark' | 'reader'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [khTime, setKhTime] = useState('');
  
  const [newNotebookName, setNewNotebookName] = useState('');
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [highlightType, setHighlightType] = useState<'todo' | 'notTodo' | 'none'>('none');
  const [numbered, setNumbered] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500'];
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  // Load notebooks
  const loadNotebooks = useCallback((userId: string) => {
    const q = query(collection(db, 'notebooks'), where('userId', '==', userId));

    return onSnapshot(q, (snapshot) => {
      const loadedNotebooks: Notebook[] = [];
      snapshot.forEach((doc) => {
        loadedNotebooks.push({
          id: doc.id,
          ...doc.data()
        } as Notebook);
      });
      setNotebooks(loadedNotebooks);
      setSelectedNotebook((current) => current || loadedNotebooks[0]?.id || null);
    });
  }, []);

  // Auth state listener
  useEffect(() => {
    let notebooksUnsubscribe: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          email: currentUser.email,
          id: currentUser.uid,
          displayName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Creator'),
          photoURL: currentUser.photoURL
        });
        notebooksUnsubscribe?.();
        notebooksUnsubscribe = loadNotebooks(currentUser.uid);
      } else {
        notebooksUnsubscribe?.();
        setUser(null);
        setNotebooks([]);
        setPages([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      notebooksUnsubscribe?.();
    };
  }, [loadNotebooks]);

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
          setHighlightType('none');
          setNumbered(false);
        }
      });

      return () => unsubscribe();
    }
  }, [selectedNotebook, selectedPage, user]);

  useEffect(() => {
    const updateTime = () => {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'full',
        timeStyle: 'medium',
        timeZone: 'Asia/Bangkok'
      });
      setKhTime(formatter.format(new Date()));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const themed = (darkClass: string, lightClass: string, readerClass?: string) => {
    if (theme === 'dark') return darkClass;
    if (theme === 'reader') return readerClass || lightClass;
    return lightClass;
  };

  const readerPanelClass = 'bg-[#fdf6e3] text-[#2d2a32] border-[#e4d8b4]';
  const setErrorMessage = (err: unknown) => setError(err instanceof Error ? err.message : 'An unexpected error occurred');

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
    } catch (err) {
      setErrorMessage(err);
    }
  };

  // Create page
  const createPage = async () => {
    if (!newPageTitle.trim() || !selectedNotebook || !user) return;

    try {
      const docRef = await addDoc(collection(db, 'pages'), {
        title: newPageTitle,
        content: pageContent,
        notebookId: selectedNotebook,
        userId: user.id,
        timestamp: new Date().toLocaleDateString(),
        liked: false,
        archived: false,
        highlightType,
        numbered
      });
      setNewPageTitle('');
      setPageContent('');
      setSelectedPage(docRef.id);
      setEditingPageId(docRef.id);
    } catch (err) {
      setErrorMessage(err);
    }
  };

  // Select page and load content
  const selectPage = (page: Page) => {
    setSelectedPage(page.id);
    setPageContent(page.content);
    setHighlightType(page.highlightType || 'none');
    setNumbered(!!page.numbered);
    setEditingPageId(null);
    setRenamingPageId(null);
    setRenamingPageTitle('');
  };

  // Save page content
  const savePage = async () => {
    if (!selectedPage || !user) return;

    try {
      await updateDoc(doc(db, 'pages', selectedPage), {
        content: pageContent
      });
      setEditingPageId(null);
    } catch (err) {
      setErrorMessage(err);
    }
  };

  // Delete page
  const deletePage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pages', id));
      if (selectedPage === id) {
        setSelectedPage(null);
        setPageContent('');
        setHighlightType('none');
        setNumbered(false);
        setRenamingPageId(null);
        setRenamingPageTitle('');
      }
    } catch (err) {
      setErrorMessage(err);
    }
  };

  // Archive page
  const archivePage = async (id: string, currentArchived: boolean) => {
    try {
      await updateDoc(doc(db, 'pages', id), {
        archived: !currentArchived
      });
    } catch (err) {
      setErrorMessage(err);
    }
  };

  // Toggle like
  const toggleLike = async (id: string, currentLiked: boolean) => {
    try {
      await updateDoc(doc(db, 'pages', id), {
        liked: !currentLiked
      });
    } catch (err) {
      setErrorMessage(err);
    }
  };

  const updateHighlight = async (type: 'todo' | 'notTodo' | 'none') => {
    if (!selectedPage) return;
    setHighlightType(type);
    try {
      await updateDoc(doc(db, 'pages', selectedPage), { highlightType: type });
    } catch (err) {
      setErrorMessage(err);
    }
  };

  const toggleNumbering = async () => {
    if (!selectedPage) return;
    const next = !numbered;
    setNumbered(next);
    try {
      await updateDoc(doc(db, 'pages', selectedPage), { numbered: next });
    } catch (err) {
      setErrorMessage(err);
    }
  };

  const renamePage = async () => {
    if (!renamingPageId || !renamingPageTitle.trim()) return;

    try {
      await updateDoc(doc(db, 'pages', renamingPageId), { title: renamingPageTitle.trim() });
      setRenamingPageId(null);
      setRenamingPageTitle('');
    } catch (err) {
      setErrorMessage(err);
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
    } catch (err) {
      setErrorMessage(err);
    }
  };

  const renameNotebook = async () => {
    if (!renamingNotebookId || !renamingNotebookName.trim()) return;

    try {
      await updateDoc(doc(db, 'notebooks', renamingNotebookId), { name: renamingNotebookName.trim() });
      setRenamingNotebookId(null);
      setRenamingNotebookName('');
    } catch (err) {
      setErrorMessage(err);
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
    } catch (err) {
      setErrorMessage(err);
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
    } catch (err) {
      setErrorMessage(err);
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
    } catch (err) {
      setErrorMessage(err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      setErrorMessage(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied('content');
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themed('bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900', 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50', 'bg-gradient-to-br from-[#fdf6e3] via-[#f5deb3] to-[#f1e3c6]')}`}>
        <Loader className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themed('bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900', 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50', 'bg-gradient-to-br from-[#fdf6e3] via-[#f5deb3] to-[#f1e3c6]')}`}>
        <div className="w-full max-w-md mx-4">
          <div className="text-center mb-8">
            <Sparkles className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" style={{animationDuration: '3s'}} />
            <h1 className={`text-4xl font-bold mb-2 ${themed('text-white', 'text-gray-900', 'text-[#2d2a32]')}`}>Inspire</h1>
            <p className={themed('text-purple-200', 'text-purple-600', 'text-[#5c4b21]')}>Capture your thoughts, fuel your creativity</p>
          </div>

          {!showAuthForm ? (
            <button
              onClick={() => setShowAuthForm(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Get Started
            </button>
          ) : (
            <div className={`p-6 rounded-lg ${themed('bg-slate-800', 'bg-white', 'bg-[#f8f1d9]')} shadow-2xl`}>
              <h2 className={`text-2xl font-bold mb-4 ${themed('text-white', 'text-gray-900', 'text-[#2d2a32]')}`}>
                {authMode === 'login' ? 'Log In' : 'Sign Up'}
              </h2>
              {error && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded text-sm">{error}</div>}
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className={`w-full px-4 py-2 mb-4 rounded border-2 ${themed('bg-slate-700 border-slate-600 text-white', 'bg-gray-100 border-gray-300', 'bg-[#f8f1d9] border-[#e4d8b4] text-[#2d2a32]')} focus:outline-none focus:border-purple-500`}
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className={`w-full px-4 py-2 mb-6 rounded border-2 ${themed('bg-slate-700 border-slate-600 text-white', 'bg-gray-100 border-gray-300', 'bg-[#f8f1d9] border-[#e4d8b4] text-[#2d2a32]')} focus:outline-none focus:border-purple-500`}
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
                className={`w-full py-2 rounded mb-4 flex items-center justify-center gap-2 ${themed('bg-slate-700 hover:bg-slate-600 text-white', 'bg-gray-200', 'bg-[#eadfb8] text-[#2d2a32]')}`}
              >
                🔵 Sign in with Google
              </button>
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className={`w-full py-2 text-sm ${themed('text-purple-300', 'text-purple-600', 'text-[#5c4b21]')} hover:underline`}
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

  const highlightClasses = {
    todo: themed('bg-amber-900/20 border-amber-700 text-amber-100', 'bg-amber-50 border-amber-200 text-amber-900', readerPanelClass),
    notTodo: themed('bg-green-900/20 border-green-700 text-green-100', 'bg-green-50 border-green-200 text-green-900', 'bg-[#f2f7f1] text-[#1f3d2b] border-[#c6dfc9]'),
    none: themed('bg-slate-800 border-slate-700 text-gray-300', 'bg-white border-gray-300 text-gray-700', readerPanelClass)
  };

  return (
    <div className={`min-h-screen flex ${themed('bg-slate-900', 'bg-gray-50', 'bg-[#fdf6e3]')}`}>
      {/* Left Sidebar - Notebooks */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ${themed('bg-slate-800 border-r border-slate-700', 'bg-white border-r border-gray-200', 'bg-[#f8f1d9] border-r border-[#e4d8b4]')} flex flex-col`}>
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded ${themed('text-purple-400 hover:bg-slate-700', 'text-purple-600 hover:bg-gray-100', 'text-[#5c4b21] hover:bg-[#eadfb8]')}`}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto ${sidebarOpen ? 'px-3' : 'px-0'}`}>
          {sidebarOpen && <p className={`text-xs font-semibold mb-2 ${themed('text-slate-400', 'text-gray-500', 'text-[#5c4b21]')}`}>NOTEBOOKS</p>}
          <div className="space-y-2">
            {notebooks.map((nb) => (
              <div key={nb.id} className="group">
                <button
                  onClick={() => { setSelectedNotebook(nb.id); setRenamingNotebookId(null); setRenamingNotebookName(''); }}
                  className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition ${
                    selectedNotebook === nb.id
                      ? themed('bg-purple-500/20 text-purple-400', 'bg-purple-100 text-purple-700', 'bg-[#e8dcaf] text-[#5c4b21]')
                      : themed('hover:bg-slate-700 text-slate-300', 'hover:bg-gray-100', 'hover:bg-[#eadfb8] text-[#4a4534]')
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${nb.color}`}></div>
                  {sidebarOpen && <span className="truncate text-sm">{nb.name}</span>}
                </button>
                {sidebarOpen && selectedNotebook === nb.id && (
                  <div className="flex gap-2 px-3 py-1 text-xs opacity-0 group-hover:opacity-100">
                    {renamingNotebookId === nb.id ? (
                      <div className="flex gap-1 w-full">
                        <input
                          value={renamingNotebookName}
                          onChange={(e) => setRenamingNotebookName(e.target.value)}
                          className={`flex-1 rounded px-2 py-1 border ${themed('bg-slate-800 border-slate-600 text-white', 'bg-white border-gray-300', 'bg-[#f8f1d9] border-[#e4d8b4] text-[#2d2a32]')}`}
                        />
                        <button
                          onClick={renameNotebook}
                          className="px-2 py-1 rounded bg-green-500 text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setRenamingNotebookId(null); setRenamingNotebookName(''); }}
                          className={`px-2 py-1 rounded ${themed('bg-slate-700 text-slate-200', 'bg-gray-200', 'bg-[#eadfb8] text-[#2d2a32]')}`}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setRenamingNotebookId(nb.id); setRenamingNotebookName(nb.name); }}
                          className={`flex-1 rounded text-left ${themed('hover:bg-slate-700 text-slate-300', 'hover:bg-gray-100', 'hover:bg-[#eadfb8] text-[#4a4534]')}`}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => deleteNotebook(nb.id)}
                          className={`flex-1 rounded text-left ${themed('text-red-400 hover:bg-red-500/10', 'text-red-600 hover:bg-red-100', 'text-[#8c1d18] hover:bg-[#f4d0c8]')}`}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {sidebarOpen && (
          <div className={`p-3 ${themed('border-t border-slate-700', 'border-t border-gray-200', 'border-t border-[#e4d8b4]')}`}>
            {!showNewNotebook ? (
              <button
                onClick={() => setShowNewNotebook(true)}
                className={`w-full px-3 py-2 rounded flex items-center gap-2 ${themed('bg-slate-700 hover:bg-slate-600 text-slate-200', 'bg-gray-200 hover:bg-gray-300', 'bg-[#eadfb8] text-[#4a4534] hover:bg-[#e1d59d]')}`}
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
                  className={`w-full px-3 py-2 rounded text-sm border-2 ${themed('bg-slate-700 border-slate-600 text-white', 'bg-gray-100 border-gray-300', 'bg-[#f8f1d9] border-[#e4d8b4] text-[#2d2a32]')}`}
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
                    className={`flex-1 px-3 py-1 rounded text-sm ${themed('bg-slate-700 hover:bg-slate-600', 'bg-gray-200', 'bg-[#eadfb8]')}`}
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
        <header className={`${themed('bg-slate-800 border-b border-slate-700', 'bg-white border-b border-gray-200', 'bg-[#f8f1d9] border-b border-[#e4d8b4]')} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className={`text-2xl font-bold ${themed('text-white', 'text-gray-900', 'text-[#2d2a32]')}`}>Inspire</h1>
              <p className={`text-sm ${themed('text-slate-400', 'text-gray-500', 'text-[#5c4b21]')}`}>Welcome back, {user.displayName}</p>
              <p className={`text-xs ${themed('text-slate-500', 'text-gray-400', 'text-[#7a6f4b]')}`}>{khTime} (UTC+7)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-2 rounded-lg flex items-center gap-2 ${themed('bg-slate-700', 'bg-gray-100', 'bg-[#eadfb8]')}`}>
              <label className={`text-xs ${themed('text-slate-300', 'text-gray-700', 'text-[#5c4b21]')}`}>Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'reader')}
                className={`text-sm rounded px-2 py-1 ${themed('bg-slate-800 text-white', 'bg-white text-gray-900', 'bg-[#f8f1d9] text-[#2d2a32] border border-[#e4d8b4]')}`}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="reader">Reading</option>
              </select>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${themed('border-slate-700 bg-slate-800', 'border-gray-200 bg-white', 'border-[#e4d8b4] bg-[#f8f1d9]')}`}>
              {user.photoURL ? (
                <Image src={user.photoURL} alt={user.displayName} width={36} height={36} className="rounded-full object-cover border border-purple-200" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-semibold">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="leading-tight">
                <p className={`text-sm font-semibold ${themed('text-white', 'text-gray-900', 'text-[#2d2a32]')}`}>{user.displayName}</p>
                <p className={`text-xs ${themed('text-slate-400', 'text-gray-500', 'text-[#5c4b21]')}`}>{user.email}</p>
              </div>
            </div>
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
            <div className={`w-64 ${themed('bg-slate-800 border-r border-slate-700', 'bg-gray-100 border-r border-gray-200', 'bg-[#f8f1d9] border-r border-[#e4d8b4]')} flex flex-col overflow-hidden`}>
              <div className={`p-4 ${themed('border-b border-slate-700', 'border-b border-gray-200', 'border-b border-[#e4d8b4]')}`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={`font-semibold ${themed('text-white', 'text-gray-900', 'text-[#2d2a32]')}`}>Pages</h2>
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`text-xs px-2 py-1 rounded ${showArchived ? 'bg-orange-500/20 text-orange-400' : themed('bg-slate-700 text-slate-300', 'bg-gray-200', 'bg-[#eadfb8] text-[#4a4534]')}`}
                  >
                    {showArchived ? 'Archived' : 'Active'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSelectedPage(null);
                    setPageContent('');
                    setEditingPageId(null);
                    setHighlightType('none');
                    setNumbered(false);
                    setNewPageTitle('New Page');
                  }}
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
                        ? themed('bg-purple-500/20 text-purple-400', 'bg-purple-100 text-purple-700', 'bg-[#e8dcaf] text-[#5c4b21]')
                        : themed('hover:bg-slate-700 text-slate-300', 'hover:bg-gray-200', 'hover:bg-[#eadfb8] text-[#4a4534]')
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
                  <div className={`${themed('bg-slate-800 border-b border-slate-700', 'bg-white border-b border-gray-200', 'bg-[#f8f1d9] border-b border-[#e4d8b4]')} px-6 py-4 flex items-center justify-between`}>
                    <div className="space-y-1">
                      {renamingPageId === currentPage.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={renamingPageTitle}
                            onChange={(e) => setRenamingPageTitle(e.target.value)}
                            className={`text-xl font-semibold rounded px-2 py-1 border ${themed('bg-slate-900 border-slate-700 text-white', 'bg-white border-gray-300 text-gray-900', 'bg-[#f8f1d9] border-[#e4d8b4] text-[#2d2a32]')}`}
                          />
                          <button
                            onClick={renamePage}
                            className="px-3 py-1 text-sm rounded bg-green-500 text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setRenamingPageId(null); setRenamingPageTitle(''); }}
                            className={`px-3 py-1 text-sm rounded ${themed('bg-slate-700 text-slate-200', 'bg-gray-200', 'bg-[#eadfb8] text-[#2d2a32]')}`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <h2 className={`text-xl font-semibold ${themed('text-white', 'text-gray-900', 'text-[#2d2a32]')}`}>{currentPage.title || 'Untitled'}</h2>
                          <button
                            onClick={() => { setRenamingPageId(currentPage.id); setRenamingPageTitle(currentPage.title || ''); }}
                            className={`px-3 py-1 text-xs rounded ${themed('bg-slate-700 text-slate-200 hover:bg-slate-600', 'bg-gray-200 hover:bg-gray-300', 'bg-[#eadfb8] text-[#2d2a32] hover:bg-[#e1d59d]')}`}
                          >
                            Rename
                          </button>
                        </div>
                      )}
                      <p className={`text-xs ${themed('text-slate-400', 'text-gray-500', 'text-[#5c4b21]')}`}>Created on {currentPage.timestamp}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(pageContent)}
                        className={`p-2 rounded ${copied === 'content' ? 'bg-green-500/20 text-green-400' : themed('hover:bg-slate-700 text-slate-400', 'hover:bg-gray-200', 'hover:bg-[#eadfb8] text-[#4a4534]')}`}
                      >
                        {copied === 'content' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => toggleLike(selectedPage, currentPage.liked)}
                        className={`p-2 rounded ${currentPage.liked ? 'text-red-500' : themed('text-slate-400 hover:text-red-500', 'text-gray-500 hover:text-red-500', 'text-[#4a4534] hover:text-red-500')}`}
                      >
                        <Heart className={`w-4 h-4 ${currentPage.liked ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => archivePage(selectedPage, currentPage.archived)}
                        className={`p-2 rounded ${currentPage.archived ? 'text-orange-500' : themed('text-slate-400', 'text-gray-500', 'text-[#4a4534]')}`}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePage(selectedPage)}
                        className={`p-2 rounded ${themed('hover:bg-red-500/10 text-red-400', 'hover:bg-red-100 text-red-600', 'hover:bg-[#f4d0c8] text-[#8c1d18]')}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 px-6 py-3 ${themed('bg-slate-900 border-b border-slate-800', 'bg-gray-50 border-b border-gray-200', 'bg-[#fdf6e3] border-b border-[#e4d8b4]')}`}>
                    <span className={`text-sm ${themed('text-slate-300', 'text-gray-700', 'text-[#5c4b21]')}`}>Highlight:</span>
                    <button
                      onClick={() => updateHighlight('todo')}
                      className={`px-3 py-1 rounded text-sm ${highlightType === 'todo' ? 'bg-amber-500 text-white' : themed('bg-slate-800 text-amber-200', 'bg-amber-100 text-amber-900', 'bg-[#eadfb8] text-[#5c4b21]')}`}
                    >
                      Todo
                    </button>
                    <button
                      onClick={() => updateHighlight('notTodo')}
                      className={`px-3 py-1 rounded text-sm ${highlightType === 'notTodo' ? 'bg-green-600 text-white' : themed('bg-slate-800 text-green-200', 'bg-green-100 text-green-900', 'bg-[#e1f3df] text-[#1f3d2b]')}`}
                    >
                      Not Todo
                    </button>
                    <button
                      onClick={() => updateHighlight('none')}
                      className={`px-3 py-1 rounded text-sm ${highlightType === 'none' ? 'bg-purple-500 text-white' : themed('bg-slate-800 text-purple-200', 'bg-gray-200 text-gray-800', 'bg-[#f8f1d9] text-[#2d2a32]')}`}
                    >
                      Clear
                    </button>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={toggleNumbering}
                        className={`px-3 py-1 rounded text-sm ${numbered ? 'bg-blue-500 text-white' : themed('bg-slate-800 text-blue-200', 'bg-blue-100 text-blue-900', 'bg-[#e1ecf8] text-[#1f3d5b]')}`}
                      >
                        {numbered ? 'Disable Numbering' : 'Enable Numbering'}
                      </button>
                      <button
                        onClick={() => setEditingPageId(selectedPage)}
                        className={`px-3 py-1 rounded text-sm ${themed('bg-slate-800 text-slate-200 hover:bg-slate-700', 'bg-gray-200 hover:bg-gray-300', 'bg-[#eadfb8] text-[#2d2a32] hover:bg-[#e1d59d]')}`}
                      >
                        Edit Content
                      </button>
                    </div>
                  </div>

                  <div className={`flex-1 overflow-hidden ${themed('bg-slate-900', 'bg-gray-50', 'bg-[#fdf6e3]')} p-6`}>
                    {editingPageId === selectedPage ? (
                      <textarea
                        value={pageContent}
                        onChange={(e) => setPageContent(e.target.value)}
                        className={`w-full h-full px-4 py-3 rounded-lg border-2 resize-none focus:outline-none ${themed('bg-slate-800 border-slate-700 text-white', 'bg-white border-gray-300', 'bg-[#f8f1d9] border-[#e4d8b4] text-[#2d2a32]')}`}
                      />
                    ) : (
                      <div
                        onClick={() => setEditingPageId(selectedPage)}
                        className={`w-full h-full px-4 py-3 rounded-lg border-2 border-dashed cursor-text overflow-y-auto ${highlightClasses[highlightType]}`}
                      >
                        {pageContent
                          ? numbered
                            ? (
                                <ol className="list-decimal list-inside space-y-1">
                                  {pageContent.split('\n').map((line, idx) => (
                                    <li key={idx}>{line || '...'}</li>
                                  ))}
                                </ol>
                              )
                            : (
                                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{pageContent}</pre>
                              )
                          : 'Click to add content...'}
                      </div>
                    )}
                  </div>

                  {editingPageId === selectedPage && (
                    <div className={`${themed('bg-slate-800 border-t border-slate-700', 'bg-white border-t border-gray-200', 'bg-[#f8f1d9] border-t border-[#e4d8b4]')} px-6 py-3 flex gap-2`}>
                      <button
                        onClick={savePage}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPageId(null)}
                        className={`px-4 py-2 rounded ${themed('bg-slate-700 hover:bg-slate-600', 'bg-gray-200', 'bg-[#eadfb8]')}`}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              ) : newPageTitle !== '' ? (
                <div className={`flex-1 flex flex-col ${themed('bg-slate-900', 'bg-gray-50', 'bg-[#fdf6e3]')} p-6`}>
                  <input
                    type="text"
                    placeholder="Page title"
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    className={`px-4 py-2 mb-4 rounded border-2 ${themed('bg-slate-800 border-slate-700 text-white', 'bg-white border-gray-300', 'bg-[#f8f1d9] border-[#e4d8b4] text-[#2d2a32]')}`}
                  />
                  <textarea
                    placeholder="Start typing..."
                    value={pageContent}
                    onChange={(e) => setPageContent(e.target.value)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 resize-none focus:outline-none ${themed('bg-slate-800 border-slate-700 text-white', 'bg-white border-gray-300', 'bg-[#f8f1d9] border-[#e4d8b4] text-[#2d2a32]')}`}
                  />
                  <div className="flex items-center gap-2 mt-4">
                    <span className={`text-sm ${themed('text-slate-300', 'text-gray-700', 'text-[#5c4b21]')}`}>Highlight:</span>
                    <button
                      onClick={() => setHighlightType('todo')}
                      className={`px-3 py-1 rounded text-sm ${highlightType === 'todo' ? 'bg-amber-500 text-white' : themed('bg-slate-800 text-amber-200', 'bg-amber-100 text-amber-900', 'bg-[#eadfb8] text-[#5c4b21]')}`}
                    >
                      Todo
                    </button>
                    <button
                      onClick={() => setHighlightType('notTodo')}
                      className={`px-3 py-1 rounded text-sm ${highlightType === 'notTodo' ? 'bg-green-600 text-white' : themed('bg-slate-800 text-green-200', 'bg-green-100 text-green-900', 'bg-[#e1f3df] text-[#1f3d2b]')}`}
                    >
                      Not Todo
                    </button>
                    <button
                      onClick={() => setHighlightType('none')}
                      className={`px-3 py-1 rounded text-sm ${highlightType === 'none' ? 'bg-purple-500 text-white' : themed('bg-slate-800 text-purple-200', 'bg-gray-200 text-gray-800', 'bg-[#f8f1d9] text-[#2d2a32]')}`}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setNumbered(!numbered)}
                      className={`ml-auto px-3 py-1 rounded text-sm ${numbered ? 'bg-blue-500 text-white' : themed('bg-slate-800 text-blue-200', 'bg-blue-100 text-blue-900', 'bg-[#e1ecf8] text-[#1f3d5b]')}`}
                    >
                      {numbered ? 'Disable Numbering' : 'Enable Numbering'}
                    </button>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={createPage}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded"
                    >
                      Create Page
                    </button>
                    <button
                      onClick={() => {
                        setNewPageTitle('');
                        setHighlightType('none');
                        setNumbered(false);
                      }}
                      className={`px-4 py-2 rounded ${themed('bg-slate-700 hover:bg-slate-600', 'bg-gray-200', 'bg-[#eadfb8]')}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`flex-1 flex items-center justify-center ${themed('bg-slate-900 text-slate-400', 'bg-gray-50 text-gray-500', 'bg-[#fdf6e3] text-[#5c4b21]')}`}>
                  <p>Select a page or create a new one</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`flex-1 flex items-center justify-center ${themed('bg-slate-900 text-slate-400', 'bg-gray-50 text-gray-500', 'bg-[#fdf6e3] text-[#5c4b21]')}`}>
            <p>Create a notebook to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}