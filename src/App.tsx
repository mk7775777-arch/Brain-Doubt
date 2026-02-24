import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Mic, 
  Send, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  BookOpen, 
  Brain, 
  Sparkles,
  ChevronRight,
  User,
  Bot,
  Volume2,
  VolumeX,
  History,
  Settings,
  Plus,
  Trash2,
  Share2,
  Copy,
  Check,
  MessageSquare,
  Zap,
  Menu,
  Bell,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Flashlight,
  Home,
  Book,
  LogIn,
  LogOut,
  Mail,
  Phone,
  Chrome,
  Filter,
  Search,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti';
import Cropper, { Area } from 'react-easy-crop';
import getCroppedImg from './utils/cropImage';
import { Message, chatWithGemini } from './services/geminiService';
import { NCERT_BOOKS, NCERTBook, CLASSES, SUBJECT_FILTERS } from './data/ncertBooks';

const SUBJECTS = [
  { id: 'math', name: 'Mathematics', icon: 'Σ', color: 'bg-blue-500', accent: 'text-blue-400' },
  { id: 'science', name: 'Science', icon: '🧪', color: 'bg-emerald-500', accent: 'text-emerald-400' },
  { id: 'coding', name: 'Coding', icon: '</>', color: 'bg-purple-500', accent: 'text-purple-400' },
  { id: 'humanities', name: 'Humanities', icon: '📜', color: 'bg-amber-500', accent: 'text-amber-400' },
];

type View = 'splash' | 'onboarding' | 'login' | 'home' | 'scan' | 'solving' | 'solution' | 'crop';
type Tab = 'home' | 'books' | 'profile';

interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
  isLoggedIn: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
  subject?: string;
}

export default function App() {
  const [view, setView] = useState<View>('splash');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [user, setUser] = useState<UserProfile>({ name: 'Guest Student', isLoggedIn: false });
  const [isFirstTime, setIsFirstTime] = useState(true);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<NonNullable<Message['attachments']>>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Library states
  const [libraryClass, setLibraryClass] = useState<number>(12);
  const [librarySubject, setLibrarySubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLibraryFilters, setShowLibraryFilters] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Camera management
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    const stopCamera = () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    };

    if (view === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [view]);

  // Splash screen timeout
  useEffect(() => {
    if (view === 'splash') {
      const timer = setTimeout(() => {
        if (isFirstTime) {
          setView('onboarding');
        } else {
          setView('home');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [view, isFirstTime]);

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('braindoubt_sessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('braindoubt_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleRate = (messageId: string, rating: Message['rating'] | 'like' | 'dislike') => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, rating: rating as Message['rating'] } : m
    ));
    
    // Also update in sessions
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: s.messages.map(m => m.id === messageId ? { ...m, rating: rating as Message['rating'] } : m)
        };
      }
      return s;
    }));

    // Simple feedback
    setCopiedId('rated');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setSelectedSubject(null);
    setAttachments([]);
    setView('home');
  };

  const saveCurrentSession = (finalMessages: Message[]) => {
    if (finalMessages.length === 0) return;
    
    const title = finalMessages[0].content.slice(0, 40) || "New Doubt";
    const newSession: ChatSession = {
      id: currentSessionId || Date.now().toString(),
      title,
      messages: [...finalMessages],
      timestamp: Date.now(),
      subject: selectedSubject || undefined
    };

    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== newSession.id);
      return [newSession, ...filtered];
    });
    setCurrentSessionId(newSession.id);
  };

  const loadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setSelectedSubject(session.subject || null);
    setView('solution');
    setShowHistory(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      // Resize to max 800px for faster processing while maintaining quality for OCR
      const MAX_DIM = 800;
      let width = videoRef.current.videoWidth;
      let height = videoRef.current.videoHeight;

      if (width > height) {
        if (width > MAX_DIM) {
          height *= MAX_DIM / width;
          width = MAX_DIM;
        }
      } else {
        if (height > MAX_DIM) {
          width *= MAX_DIM / height;
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        setView('crop');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        setView('crop');
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropConfirm = async () => {
    if (capturedImage && croppedAreaPixels) {
      setIsLoading(true);
      try {
        const croppedImage = await getCroppedImg(capturedImage, croppedAreaPixels);
        const base64Data = croppedImage.split(',')[1];
        
        const newAttachments: Message['attachments'] = [{
          type: 'image',
          url: croppedImage,
          mimeType: 'image/jpeg',
          data: base64Data
        }];
        setAttachments(newAttachments);
        handleSend("Analyze this question from the image", newAttachments);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setAttachments(prev => [...prev, {
            type: 'audio',
            url: URL.createObjectURL(audioBlob),
            mimeType: 'audio/webm',
            data: base64
          }]);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async (overrideInput?: string, overrideAttachments?: Message['attachments']) => {
    const textToSend = overrideInput || input;
    const attachmentsToSend = overrideAttachments || attachments;
    if ((!textToSend.trim() && attachmentsToSend.length === 0) || isLoading) return;

    setView('solving');
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      attachments: attachmentsToSend.length > 0 ? [...attachmentsToSend] : undefined
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachments([]);

    try {
      let assistantMessageContent = "";
      const assistantMessageId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'model',
        content: '',
        timestamp: Date.now()
      }]);

      const fullResponse = await chatWithGemini(newMessages, (chunk) => {
        assistantMessageContent += chunk;
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId ? { ...m, content: assistantMessageContent } : m
        ));
      });

      if (fullResponse.toLowerCase().includes('congratulations') || fullResponse.toLowerCase().includes('correct')) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }

      saveCurrentSession([...newMessages, {
        id: assistantMessageId,
        role: 'model',
        content: fullResponse,
        timestamp: Date.now()
      }]);

      setView('solution');
    } catch (error: any) {
      console.error(error);
      setView('solution');
      let errorMessage = "Error processing your request. Please check your connection.";
      if (error.message === "API_KEY_MISSING") {
        errorMessage = "API Key is missing. Please add your Gemini API Key in the 'Secrets' panel of AI Studio with the name 'GEMINI_API_KEY'.";
      }
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: errorMessage,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSplash = () => (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black"
    >
      <motion.div
        initial={{ scale: 0.5, rotate: -20 }}
        animate={{ 
          scale: [0.5, 1.2, 1],
          rotate: [0, 10, 0],
        }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="relative mb-6"
      >
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)]">
          <Brain size={40} className="text-indigo-600" />
        </div>
        <motion.div 
          animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-3 -right-3 w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
        >
          ?
        </motion.div>
      </motion.div>
      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-black tracking-tighter text-white mb-1"
      >
        BRAINDOUBT
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.8 }}
        className="text-zinc-400 font-medium text-xs"
      >
        Clear Your Doubts. Master Your Learning.
      </motion.p>
    </motion.div>
  );

  const renderHome = () => (
    <div className="flex-1 flex flex-col gradient-mesh overflow-hidden min-h-0">
      <header className="p-4 flex items-center justify-between">
        <button onClick={() => setShowHistory(true)} className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-primary rounded-lg flex items-center justify-center">
            <Brain size={16} />
          </div>
          <span className="font-bold tracking-tight text-base">Braindoubt</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all relative">
            <Bell size={20} />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-accent rounded-full" />
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className="w-9 h-9 bg-brand-primary/20 border border-brand-primary/30 rounded-xl flex items-center justify-center text-brand-primary hover:bg-brand-primary/30 transition-all"
          >
            <User size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-32 min-h-0">
        <div className="mt-6 mb-6">
          <h2 className="text-2xl font-bold mb-1">Hello, Learner!</h2>
          <p className="text-zinc-400 text-sm">Ready to tackle some challenges?</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative group">
          <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-1 pl-4 focus-within:border-brand-primary/50 focus-within:bg-white/10 transition-all shadow-lg overflow-hidden mx-1">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
              placeholder="Ask anything..."
              className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-base py-2 text-white placeholder:text-zinc-500"
            />
            <button 
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shrink-0 mr-1"
            >
              {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-10">
          {SUBJECTS.map(s => (
            <button 
              key={s.id}
              onClick={() => {
                setSelectedSubject(s.id);
                handleSend(`I need help with ${s.name}. Can you explain some core concepts or help me solve a problem?`);
              }}
              className={`p-4 rounded-[1.5rem] text-left transition-all border ${
                selectedSubject === s.id ? 'bg-white/10 border-brand-primary' : 'bg-white/5 border-white/5'
              }`}
            >
              <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white mb-3 shadow-lg`}>
                <span className="text-lg font-bold">{s.icon}</span>
              </div>
              <h3 className="font-bold text-base">{s.name}</h3>
              <p className="text-[10px] text-zinc-500">Master concepts</p>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-zinc-400 uppercase text-[10px] tracking-widest">Recent Doubts</h3>
            <button onClick={() => setShowHistory(true)} className="text-brand-accent text-[10px] font-bold hover:underline">View All</button>
          </div>
          {sessions.slice(0, 3).map(s => (
            <button 
              key={s.id}
              onClick={() => loadSession(s)}
              className="w-full p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3 hover:bg-white/10 transition-all group"
            >
              <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-brand-accent transition-colors">
                <MessageSquare size={18} />
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="font-bold truncate text-sm">{s.title}</p>
                <p className="text-[10px] text-zinc-500">{new Date(s.timestamp).toLocaleDateString()}</p>
              </div>
              <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded-full uppercase tracking-wider">
                Solved
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-24 left-0 right-0 px-6 flex justify-center z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setView('scan')}
          className="h-12 w-full max-w-md gradient-brand rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(99,102,241,0.2)] animate-pulse-glow"
        >
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Camera size={20} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">Scan Question</span>
        </motion.button>
      </div>
    </div>
  );

  const renderScan = () => (
    <div className="flex-1 flex flex-col bg-black relative">
      <div className="absolute inset-0 bg-black overflow-hidden">
        {/* Real Camera Feed */}
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Overlays */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-64 dashed-box" />
        </div>
      </div>

      <header className="relative z-10 p-4 flex items-center justify-between">
        <button onClick={() => setView('home')} className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl text-white">
          <ArrowLeft size={20} />
        </button>
        <button className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl text-white">
          <Flashlight size={20} />
        </button>
      </header>

      <div className="mt-auto relative z-10 p-6 pb-10 flex flex-col items-center gap-6">
        <p className="text-white text-sm font-medium text-center bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md">
          Align your question within the box
        </p>
        
        <div className="flex items-center gap-6">
          <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white/10 rounded-full text-white">
            <ImageIcon size={22} />
          </button>
          <button 
            onClick={() => {
              if (!isLoading) {
                capturePhoto();
              }
            }}
            disabled={isLoading}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="animate-spin text-black" size={24} />
            ) : (
              <div className="w-12 h-12 bg-white border-2 border-black rounded-full" />
            )}
          </button>
          <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-3 rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-white'}`}>
            <Mic size={22} />
          </button>
        </div>

        <button 
          onClick={() => { setView('home'); setTimeout(() => scrollRef.current?.focus(), 100); }}
          className="text-zinc-400 text-sm font-bold uppercase tracking-widest hover:text-white transition-colors"
        >
          Type Question Manually
        </button>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
    </div>
  );

  const renderOnboarding = () => (
    <div className="flex-1 flex flex-col bg-dark-bg p-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-brand-primary/20 rounded-2xl flex items-center justify-center mb-5"
        >
          <Brain size={40} className="text-brand-primary" />
        </motion.div>
        <h1 className="text-xl font-bold mb-2 tracking-tight">Welcome to Braindoubt</h1>
        <p className="text-zinc-400 text-sm mb-8 max-w-[220px]">Your personal AI tutor and NCERT library. Let's make learning fun and easy.</p>
        
        <div className="space-y-2.5 w-full max-w-[260px]">
          <button 
            onClick={() => setView('login')}
            className="w-full py-2.5 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 text-sm"
          >
            Get Started
          </button>
          <button 
            onClick={() => { setIsFirstTime(false); setView('home'); }}
            className="w-full py-2.5 bg-white/5 text-zinc-400 font-bold rounded-xl border border-white/5 text-sm"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="flex-1 flex flex-col bg-dark-bg p-5">
      <header className="mb-6">
        <button onClick={() => setView('onboarding')} className="p-2 bg-white/5 rounded-lg text-zinc-400">
          <ArrowLeft size={18} />
        </button>
      </header>
      
      <div className="flex-1 flex flex-col">
        <h2 className="text-xl font-bold mb-1">Create Account</h2>
        <p className="text-zinc-400 text-xs mb-8">Join thousands of students learning better every day.</p>
        
        <div className="space-y-2.5">
          <button 
            onClick={() => { 
              setUser({ name: 'Rahul Sharma', email: 'rahul.sharma@gmail.com', isLoggedIn: true });
              setIsFirstTime(false); 
              setView('home'); 
            }}
            className="w-full p-2.5 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-all"
          >
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Chrome size={16} className="text-blue-400" />
            </div>
            <span className="font-bold text-xs">Continue with Google</span>
          </button>
          
          <button 
            onClick={() => { 
              setUser({ name: 'Rahul Sharma', phone: '+91 98765 43210', isLoggedIn: true });
              setIsFirstTime(false); 
              setView('home'); 
            }}
            className="w-full p-2.5 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-all"
          >
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Phone size={16} className="text-emerald-400" />
            </div>
            <span className="font-bold text-xs">Continue with Phone</span>
          </button>
          
          <button 
            onClick={() => { 
              setUser({ name: 'Rahul Sharma', email: 'rahul.sharma@email.com', isLoggedIn: true });
              setIsFirstTime(false); 
              setView('home'); 
            }}
            className="w-full p-2.5 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-all"
          >
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Mail size={16} className="text-purple-400" />
            </div>
            <span className="font-bold text-xs">Continue with Email</span>
          </button>
        </div>
        
        <div className="mt-auto">
          <button 
            onClick={() => { setIsFirstTime(false); setView('home'); }}
            className="w-full py-2 text-zinc-500 font-bold text-xs hover:text-white transition-colors"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );

  const renderBooks = () => {
    const filteredBooks = NCERT_BOOKS.filter(book => {
      const matchesClass = book.class === libraryClass;
      const matchesSubject = librarySubject === 'All' || book.subject === librarySubject;
      const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesClass && matchesSubject && matchesSearch;
    });

    return (
      <div className="flex-1 flex flex-col bg-dark-bg overflow-hidden">
        <header className="p-3 pb-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">NCERT Library</h2>
            <button 
              onClick={() => setShowLibraryFilters(!showLibraryFilters)}
              className={`p-1.5 rounded-lg transition-all ${showLibraryFilters ? 'bg-brand-primary text-white' : 'bg-white/5 text-zinc-400'}`}
            >
              <Filter size={14} />
            </button>
          </div>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
              type="text" 
              placeholder="Search books..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-9 pr-4 text-white text-[10px] focus:outline-none focus:border-brand-primary/50 transition-all"
            />
          </div>

          <AnimatePresence>
            {showLibraryFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-3 mb-3"
              >
                <div className="space-y-1">
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest px-1">Select Class</p>
                  <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {CLASSES.map(c => (
                      <button 
                        key={c}
                        onClick={() => setLibraryClass(c)}
                        className={`min-w-[1.75rem] h-7 rounded-lg font-bold text-[10px] transition-all border ${libraryClass === c ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white/5 border-white/5 text-zinc-500'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest px-1">Select Subject</p>
                  <div className="flex flex-wrap gap-1">
                    {SUBJECT_FILTERS.map(s => (
                      <button 
                        key={s}
                        onClick={() => setLibrarySubject(s)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border ${librarySubject === s ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!showLibraryFilters && (
            <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
              {SUBJECT_FILTERS.slice(0, 5).map(s => (
                <button 
                  key={s}
                  onClick={() => setLibrarySubject(s)}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all border ${librarySubject === s ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-white/5 border-white/5 text-zinc-500'}`}
                >
                  {s}
                </button>
              ))}
              <button 
                onClick={() => setShowLibraryFilters(true)}
                className="px-3 py-1 rounded-full text-[9px] font-bold whitespace-nowrap bg-white/5 border border-white/5 text-zinc-500"
              >
                More...
              </button>
            </div>
          )}
        </header>
        
        <div className="flex-1 overflow-y-auto p-3 pt-1">
          <div className="space-y-3">
            {filteredBooks.map(book => (
              <motion.div 
                key={book.id}
                whileHover={{ scale: 1.01 }}
                className="group cursor-pointer bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4 hover:bg-white/10 transition-all"
                onClick={() => window.open(book.url, '_blank')}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm line-clamp-2 leading-tight mb-1">{book.title}</h4>
                  <p className="text-[10px] text-zinc-500">Class {book.class} • {book.subject}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-brand-primary text-[10px] font-bold">
                    <ExternalLink size={10} />
                    Read Online
                  </div>
                </div>
                <div className="w-16 h-20 bg-white/5 rounded-lg overflow-hidden border border-white/5 relative shrink-0">
                  <img 
                    src={book.thumbnail} 
                    alt={book.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </motion.div>
            ))}
          </div>
          
          {filteredBooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <BookOpen size={32} className="text-zinc-700" />
              </div>
              <p className="text-zinc-500 font-medium">No books found for this selection.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProfile = () => (
    <div className="flex-1 flex flex-col bg-dark-bg p-6">
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-brand-primary/10 rounded-3xl flex items-center justify-center mb-4 border border-brand-primary/20 relative">
          <User size={48} className="text-brand-primary" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-success rounded-xl flex items-center justify-center border-4 border-dark-bg">
            <Check size={16} className="text-black" />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-0.5">{user.name}</h2>
        {user.email && <p className="text-zinc-500 text-xs mb-1">{user.email}</p>}
        {user.phone && <p className="text-zinc-500 text-xs mb-1">{user.phone}</p>}
        <p className="text-zinc-500 text-xs font-medium">Class {libraryClass} Student</p>
      </div>
      
      <div className="space-y-3">
        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <History size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-sm">Study History</p>
              <p className="text-[10px] text-zinc-500">{sessions.length} sessions completed</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-zinc-700" />
        </div>
        
        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Settings size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-sm">App Settings</p>
              <p className="text-[10px] text-zinc-500">Notifications, Theme, TTS</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-zinc-700" />
        </div>
        
        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-sm">Braindoubt Pro</p>
              <p className="text-[10px] text-zinc-500">Unlimited AI explanations</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-zinc-700" />
        </div>
      </div>
      
      <div className="mt-auto">
        <button className="w-full py-3 bg-red-500/10 text-red-500 font-bold text-sm rounded-xl border border-red-500/10 flex items-center justify-center gap-2">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  const renderBottomNav = () => (
    <div className="h-14 bg-dark-surface/80 backdrop-blur-xl border-t border-white/5 px-4 flex items-center justify-around relative z-50">
      <button 
        onClick={() => { setActiveTab('home'); setView('home'); }}
        className={`flex flex-col items-center gap-0.5 transition-all min-w-[60px] ${activeTab === 'home' ? 'text-brand-primary' : 'text-zinc-500'}`}
      >
        <Home size={16} fill={activeTab === 'home' ? 'currentColor' : 'none'} />
        <span className="text-[6px] font-bold uppercase tracking-widest">Home</span>
      </button>
      
      <button 
        onClick={() => { setActiveTab('books'); setView('home'); }}
        className={`flex flex-col items-center gap-0.5 transition-all min-w-[60px] ${activeTab === 'books' ? 'text-brand-primary' : 'text-zinc-500'}`}
      >
        <Book size={16} fill={activeTab === 'books' ? 'currentColor' : 'none'} />
        <span className="text-[6px] font-bold uppercase tracking-widest">Books</span>
      </button>
      
      <button 
        onClick={() => { setActiveTab('profile'); setView('home'); }}
        className={`flex flex-col items-center gap-0.5 transition-all min-w-[60px] ${activeTab === 'profile' ? 'text-brand-primary' : 'text-zinc-500'}`}
      >
        <User size={16} fill={activeTab === 'profile' ? 'currentColor' : 'none'} />
        <span className="text-[6px] font-bold uppercase tracking-widest">Profile</span>
      </button>
    </div>
  );
  const renderSolving = () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg p-4 text-center">
      <div className="relative mb-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          className="w-24 h-24 border-2 border-dashed border-brand-primary/30 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-12 h-12 bg-brand-primary/20 rounded-full blur-lg"
          />
          <Brain size={32} className="text-brand-primary animate-float relative z-10" />
        </div>
      </div>
      <h2 className="text-lg font-bold mb-1.5">AI is Thinking...</h2>
      <p className="text-zinc-400 text-[10px] max-w-[200px] mx-auto">Analyzing symbols, logic, and context to provide the best explanation.</p>
    </div>
  );

  const renderCrop = () => (
    <div className="flex-1 flex flex-col bg-black relative">
      <header className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => setView('scan')} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white">
          <ArrowLeft size={24} />
        </button>
        <h3 className="text-white font-bold">Crop Problem</h3>
        <div className="w-12" />
      </header>

      <div className="flex-1 relative">
        {capturedImage && (
          <Cropper
            image={capturedImage}
            crop={crop}
            zoom={zoom}
            aspect={undefined}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-6">
        <div className="w-full max-w-xs">
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-primary"
          />
        </div>
        
        <button 
          onClick={handleCropConfirm}
          disabled={isLoading}
          className="w-full max-w-xs py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          Confirm Crop
        </button>
      </div>
    </div>
  );

  const renderSolution = () => (
    <div className="flex-1 flex flex-col bg-dark-bg overflow-hidden min-h-0">
      <header className="p-3 border-b border-white/5 flex items-center justify-between bg-dark-surface/80 backdrop-blur-md">
        <button onClick={() => setView('home')} className="p-1.5 text-zinc-400">
          <ArrowLeft size={18} />
        </button>
        <span className="font-bold text-[10px] uppercase tracking-widest text-zinc-500">Solution</span>
        <button className="p-1.5 text-zinc-400">
          <Share2 size={16} />
        </button>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0 scroll-smooth"
      >
        {messages.filter(m => m.role === 'user').slice(-1).map(m => (
          <div key={m.id} className="p-3.5 bg-white/5 border border-white/5 rounded-xl">
            <p className="text-[9px] font-bold text-brand-accent uppercase tracking-widest mb-1.5">Your Question</p>
            <p className="text-sm font-medium text-white">{m.content}</p>
            {m.attachments?.map((att, i) => (
              <img key={i} src={att.url} className="mt-2.5 rounded-lg max-h-32 w-full object-cover border border-white/10" />
            ))}
          </div>
        ))}

        <div className="space-y-4">
          {messages.filter(m => m.role === 'model').slice(-1).map(m => (
            <div key={m.id} className="space-y-4">
              <div className="markdown-body bg-dark-surface p-5 rounded-2xl border border-white/5 shadow-xl text-sm">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {m.content.replace(/\$/g, '')}
                </Markdown>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleSend("Explain this step in more detail")}
                  className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={12} className="text-brand-accent" />
                  Explain Step
                </button>
                <button 
                  onClick={() => handleSend("Give me a similar problem to practice")}
                  className="p-2.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <Zap size={12} className="text-brand-success" />
                  Practice
                </button>
              </div>

              <div className="pt-5 border-t border-white/5">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    {m.rating ? 'Thanks for your feedback!' : 'Rate this solution'}
                  </p>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleRate(m.id, 'great')}
                      className={`p-1 rounded-lg transition-all ${m.rating === 'great' ? 'text-brand-success bg-brand-success/10' : 'text-zinc-500 hover:text-white'}`}
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleRate(m.id, 'bad')}
                      className={`p-1 rounded-lg transition-all ${m.rating === 'bad' ? 'text-red-500 bg-red-500/10' : 'text-zinc-500 hover:text-white'}`}
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-center gap-2">
                  {[
                    { emoji: '😞', value: 'bad' },
                    { emoji: '😐', value: 'neutral' },
                    { emoji: '😊', value: 'good' },
                    { emoji: '🤩', value: 'great' }
                  ].map((item, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleRate(m.id, item.value as Message['rating'])}
                      className={`text-lg hover:scale-110 transition-transform p-2 rounded-lg border ${
                        m.rating === item.value 
                          ? 'bg-brand-primary/20 border-brand-primary shadow-lg shadow-brand-primary/10' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 bg-dark-surface border-t border-white/5">
        <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl p-2 pl-4">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2"
          />
          <button onClick={() => handleSend()} className="p-2 bg-brand-primary rounded-xl text-white">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-dark-bg text-zinc-100 font-sans overflow-hidden flex justify-center">
      <div className="w-full max-w-md flex flex-col relative bg-dark-bg shadow-2xl border-x border-white/5">
        {/* Sidebar - History */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 z-[60] w-80 bg-dark-surface border-r border-white/5 p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-bold">History</h3>
                <button onClick={() => setShowHistory(false)} className="p-2 text-zinc-500">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {sessions.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => loadSession(s)}
                    className="w-full p-4 rounded-2xl text-left hover:bg-white/5 transition-all flex items-center justify-between group"
                  >
                    <div className="overflow-hidden">
                      <p className="font-bold truncate text-sm">{s.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{new Date(s.timestamp).toLocaleDateString()}</p>
                    </div>
                    <Trash2 
                      size={14} 
                      className="text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessions(prev => prev.filter(sess => sess.id !== s.id));
                      }}
                    />
                  </button>
                ))}
              </div>
              <button 
                onClick={startNewChat}
                className="mt-6 w-full p-4 bg-brand-primary rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20"
              >
                <Plus size={20} />
                New Chat
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col relative min-h-0">
          <AnimatePresence mode="wait">
            {view === 'splash' && <motion.div key="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">{renderSplash()}</motion.div>}
            {view === 'onboarding' && <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">{renderOnboarding()}</motion.div>}
            {view === 'login' && <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">{renderLogin()}</motion.div>}
            
            {view === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
                {activeTab === 'home' && renderHome()}
                {activeTab === 'books' && renderBooks()}
                {activeTab === 'profile' && renderProfile()}
                {renderBottomNav()}
              </motion.div>
            )}
            
            {view === 'scan' && <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">{renderScan()}</motion.div>}
            {view === 'crop' && <motion.div key="crop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">{renderCrop()}</motion.div>}
            {view === 'solving' && <motion.div key="solving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">{renderSolving()}</motion.div>}
            {view === 'solution' && <motion.div key="solution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">{renderSolution()}</motion.div>}
          </AnimatePresence>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-dark-surface rounded-[2.5rem] w-full max-w-md p-8 border border-white/5"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Settings</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 text-zinc-500"><X size={24} /></button>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <div>
                    <p className="font-bold">Voice Feedback</p>
                    <p className="text-xs text-zinc-500">Read solutions aloud</p>
                  </div>
                  <button onClick={() => setIsTtsEnabled(!isTtsEnabled)} className={`w-12 h-6 rounded-full relative transition-all ${isTtsEnabled ? 'bg-brand-primary' : 'bg-zinc-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isTtsEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <button className="w-full p-4 bg-red-500/10 text-red-500 font-bold rounded-2xl hover:bg-red-500/20 transition-all">Clear All Data</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toast Feedback */}
      <AnimatePresence>
        {copiedId === 'rated' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-brand-success text-black px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2"
          >
            <div className="w-5 h-5 bg-black/20 rounded-full flex items-center justify-center">
              <Sparkles size={12} />
            </div>
            Feedback Received!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
