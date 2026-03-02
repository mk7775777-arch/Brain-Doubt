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
  RotateCw,
  Maximize2,
  Filter,
  Search,
  ExternalLink,
  Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import getCroppedImg from './utils/cropImage';
import { Message, chatWithGemini } from './services/geminiService';
import { NCERT_BOOKS, NCERTBook, CLASSES, SUBJECT_FILTERS } from './data/ncertBooks';

const SUBJECTS = [
  { id: 'math', name: 'Mathematics', icon: 'Σ', color: 'bg-blue-500', accent: 'text-blue-400' },
  { id: 'science', name: 'Science', icon: '🧪', color: 'bg-emerald-500', accent: 'text-emerald-400' },
  { id: 'coding', name: 'Coding', icon: '</>', color: 'bg-purple-500', accent: 'text-purple-400' },
  { id: 'humanities', name: 'Humanities', icon: '📜', color: 'bg-amber-500', accent: 'text-amber-400' },
];

const FEEDBACK_REASONS = [
  "Inaccurate",
  "Hard to understand",
  "Too long",
  "Not helpful",
  "Formatting issues"
];

type View = 'splash' | 'onboarding' | 'login' | 'home' | 'scan' | 'solving' | 'solution' | 'crop' | 'tutor';
type Tab = 'home' | 'books' | 'profile';

interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  class: number;
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
  const [previousView, setPreviousView] = useState<View | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const navigateToView = (newView: View) => {
    setPreviousView(view);
    setView(newView);
  };
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('braindoubt_user');
    return saved ? JSON.parse(saved) : { name: 'Guest Student', class: 12, isLoggedIn: false };
  });
  const [isFirstTime, setIsFirstTime] = useState(() => !localStorage.getItem('braindoubt_user'));
  const [onboardingStep, setOnboardingStep] = useState(0);
  
  useEffect(() => {
    localStorage.setItem('braindoubt_user', JSON.stringify(user));
  }, [user]);

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
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 5,
    y: 5,
    width: 90,
    height: 90
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);

  // Library states
  const [libraryClass, setLibraryClass] = useState<number>(12);
  const handleRotate = () => {
    if (!capturedImage) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(rotatedDataUrl);
        // Reset crop after rotation as dimensions changed
        setCrop({
          unit: '%',
          x: 5,
          y: 5,
          width: 90,
          height: 90
        });
      }
    };
    img.src = capturedImage;
  };
  const [librarySubject, setLibrarySubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLibraryFilters, setShowLibraryFilters] = useState(false);
  
  const [isLoggingIn, setIsLoggingIn] = useState<string | null>(null);
  const [loginStep, setLoginStep] = useState<'login' | 'signup'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', dob: '', gender: '', class: 12 });
  
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [showTutorPlusMenu, setShowTutorPlusMenu] = useState(false);
  const [tutorMessages, setTutorMessages] = useState<Message[]>([
    { id: '1', role: 'model', content: 'How can I help you to solve the problem?', timestamp: Date.now() }
  ]);
  const [tutorInput, setTutorInput] = useState('');
  
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const subjects = ['History', 'Science', 'Social Science', 'Maths'];
  const [theme, setTheme] = useState<'purple' | 'blue' | 'emerald' | 'rose'>('purple');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const avatars = ['👨‍🎓', '👩‍🎓', '🧑‍🔬', '👩‍🔬', '🧑‍💻', '👩‍💻', '🦸‍♂️', '🦸‍♀️'];
  const [selectedAvatar, setSelectedAvatar] = useState('👨‍🎓');
  
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
    const interval = setInterval(() => {
      setCurrentSubjectIndex((prev) => (prev + 1) % subjects.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

  const [feedbackReason, setFeedbackReason] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState<string | null>(null);

  const handleRate = (messageId: string, rating: Message['rating'] | 'like' | 'dislike') => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, rating: rating as Message['rating'] } : m
    ));

    setTutorMessages(prev => prev.map(m => 
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

    if (rating === 'bad') {
      setShowFeedbackInput(messageId);
      setFeedbackReason('');
    } else {
      setShowFeedbackInput(null);
    }

    // Simple feedback
    setCopiedId('rated');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const submitFeedbackReason = (messageId: string) => {
    if (!feedbackReason.trim()) return;

    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedbackReason } : m
    ));

    setTutorMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedbackReason } : m
    ));

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: s.messages.map(m => m.id === messageId ? { ...m, feedbackReason } : m)
        };
      }
      return s;
    }));

    setFeedbackReason('');
    setShowFeedbackInput(null);
    setCopiedId('feedback_sent');
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
        setAspect(undefined);
        navigateToView('crop');
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
        setAspect(undefined);
        navigateToView('crop');
        // Reset input value
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        undefined,
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
  };

  const handleCropConfirm = async () => {
    if (capturedImage && completedCrop && imgRef.current) {
      setIsLoading(true);
      try {
        const croppedImage = await getCroppedImg(
          capturedImage, 
          completedCrop,
          imgRef.current.width,
          imgRef.current.height
        );
        if (!croppedImage) return;
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

  const getThemeClass = () => {
    switch (theme) {
      case 'purple': return 'bg-tutor-purple';
      case 'blue': return 'bg-tutor-blue';
      case 'emerald': return 'bg-tutor-emerald';
      case 'rose': return 'bg-tutor-rose';
      default: return 'bg-tutor-purple';
    }
  };

  const renderHome = () => (
    <div className={`flex-1 flex flex-col ${getThemeClass()} animate-gradient overflow-hidden min-h-0 relative`}>
      {/* Speech Search Bar Overlay */}
      <AnimatePresence>
        {isSpeechActive && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-[70] p-4 bg-[#0A0B1E]/90 backdrop-blur-xl border-b border-white/10"
          >
            <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3 border border-white/10">
              <Mic size={20} className="text-brand-accent animate-pulse" />
              <input 
                autoFocus
                type="text"
                placeholder="Type or speak your question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && input.trim()) {
                    handleSend();
                    setIsSpeechActive(false);
                  }
                }}
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-zinc-500"
              />
              <button 
                onClick={() => {
                  if (input.trim()) {
                    handleSend();
                    setIsSpeechActive(false);
                  }
                }}
                className="p-2 bg-brand-primary rounded-xl text-white"
              >
                <Search size={18} />
              </button>
              <button onClick={() => setIsSpeechActive(false)} className="text-zinc-400">
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-32 min-h-0 no-scrollbar">
        {/* Top Text Header */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-[2.5rem] font-black leading-[1.1] text-white tracking-tight">
              Ready to master<br />
              <div className="h-[3rem] overflow-hidden relative">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={subjects[currentSubjectIndex]}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute left-0 text-brand-accent"
                  >
                    {subjects[currentSubjectIndex]}?
                  </motion.span>
                </AnimatePresence>
              </div>
            </h2>
          </div>
          
          {/* Animated Book Illustration */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-24 h-24 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-white/20 rounded-full"
            />
            <BookOpen size={64} className="text-white relative z-10" />
            
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="absolute -top-2 -right-2 text-brand-accent"
            >
              <Sparkles size={20} />
            </motion.div>
            
            {/* Animated Hand Pointing */}
            <motion.div
              animate={{ x: [-5, 5, -5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-6 top-1/2 -translate-y-1/2 text-3xl z-20"
            >
              👈
            </motion.div>
          </motion.div>
        </div>

        {/* Ask a Question Card */}
        <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-6 mb-6 shadow-xl border border-white/20">
          <h3 className="text-[#4A4B65] font-bold text-lg mb-6 ml-2">Ask a question</h3>
          
          <div className="space-y-6">
            {/* Camera and Voice Options Together */}
            <div className="flex items-center justify-center gap-6">
              {/* Camera Button */}
              <button 
                onClick={() => navigateToView('scan')}
                className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              >
                <Camera size={32} className="text-[#0A0B1E]" />
              </button>

              {/* Microphone Button */}
              <button 
                onClick={() => {
                  setIsSpeechActive(true);
                  if ('webkitSpeechRecognition' in window) {
                    const recognition = new (window as any).webkitSpeechRecognition();
                    recognition.continuous = false;
                    recognition.interimResults = true;
                    recognition.onresult = (event: any) => {
                      const transcript = event.results[0][0].transcript;
                      setInput(transcript);
                    };
                    recognition.onend = () => setIsSpeechActive(false);
                    recognition.start();
                  }
                }}
                className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              >
                <Mic size={32} className="text-[#0A0B1E]" />
              </button>
            </div>

            {/* Search/Keyboard Button Moved Down */}
            <button 
              onClick={() => setIsSpeechActive(true)}
              className="w-full h-14 bg-white/80 rounded-2xl flex items-center px-5 gap-3 shadow-md hover:bg-white transition-all group"
            >
              <Keyboard size={20} className="text-[#4A4B65] group-hover:text-[#0A0B1E]" />
              <span className="text-[#4A4B65] text-sm font-bold group-hover:text-[#0A0B1E]">Type your question...</span>
            </button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => navigateToView('scan')}
            className="aspect-square bg-gradient-to-br from-[#2D3E50] to-[#1A2533] rounded-[2rem] p-6 text-left flex flex-col justify-between shadow-xl border border-white/5 group"
          >
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Maximize2 size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-lg leading-tight">Math Solver</h4>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('books')}
            className="aspect-square bg-gradient-to-br from-[#6B5B3E] to-[#4A3D29] rounded-[2rem] p-6 text-left flex flex-col justify-between shadow-xl border border-white/5 group"
          >
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Book size={24} />
            </div>
            <div>
              <h4 className="text-white font-bold text-lg leading-tight">Books</h4>
            </div>
          </button>
        </div>

        {/* AI Tutor Option */}
        <div className="flex justify-center mb-8">
          <button 
            onClick={() => navigateToView('tutor')}
            className="w-full max-w-xs py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] transition-all border border-white/10 group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white group-hover:rotate-12 transition-transform">
              <Bot size={24} />
            </div>
            <div className="text-left">
              <h4 className="text-white font-bold text-lg leading-tight">AI Tutor</h4>
              <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">Personal Assistant</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderTutor = () => (
    <div className={`flex-1 flex flex-col ${getThemeClass()} animate-gradient relative overflow-hidden`}>
      <header className="p-4 flex items-center gap-4 relative z-10">
        <button onClick={() => setView('home')} className="p-2 bg-white/10 rounded-xl text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-white font-bold">AI Tutor</h2>
            <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">Always Active</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar relative z-10">
        {tutorMessages.map((m) => (
          <motion.div 
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-4 rounded-2xl ${
              m.role === 'user' 
                ? 'bg-brand-primary text-white rounded-tr-none' 
                : 'bg-white/10 backdrop-blur-md text-white border border-white/10 rounded-tl-none'
            }`}>
              <div className="markdown-body">
                <Markdown>{m.content}</Markdown>
              </div>

              {m.role === 'model' && (
                <div className="mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                      {m.rating ? 'Feedback received' : 'Helpful?'}
                    </p>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleRate(m.id, 'good')}
                        className={`p-1 rounded-lg transition-all ${m.rating === 'good' || m.rating === 'great' ? 'text-brand-success bg-brand-success/10' : 'text-zinc-500 hover:text-white'}`}
                      >
                        <ThumbsUp size={12} />
                      </button>
                      <button 
                        onClick={() => handleRate(m.id, 'bad')}
                        className={`p-1 rounded-lg transition-all ${m.rating === 'bad' ? 'text-red-500 bg-red-500/10' : 'text-zinc-500 hover:text-white'}`}
                      >
                        <ThumbsDown size={12} />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showFeedbackInput === m.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 space-y-2 overflow-hidden"
                      >
                        <textarea 
                          value={feedbackReason}
                          onChange={(e) => setFeedbackReason(e.target.value)}
                          placeholder="Tell us why..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-[10px] text-white focus:border-brand-primary/50 focus:ring-0 min-h-[60px] resize-none"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowFeedbackInput(null)}
                            className="flex-1 py-1.5 rounded-lg bg-white/5 text-zinc-400 text-[8px] font-bold uppercase tracking-widest"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => submitFeedbackReason(m.id)}
                            disabled={!feedbackReason.trim()}
                            className="flex-[2] py-1.5 rounded-lg bg-brand-primary text-white text-[8px] font-bold uppercase tracking-widest disabled:opacity-50"
                          >
                            Submit
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {m.feedbackReason && !showFeedbackInput && (
                    <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/5">
                      <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Your Feedback</p>
                      <p className="text-[9px] text-zinc-300 italic">"{m.feedbackReason}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Plus Menu */}
      <AnimatePresence>
        {showTutorPlusMenu && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-24 left-6 right-6 z-50 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 flex justify-around shadow-2xl"
          >
            <button 
              onClick={() => { navigateToView('scan'); setShowTutorPlusMenu(false); }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white group-hover:bg-white/30 transition-all">
                <Camera size={24} />
              </div>
              <span className="text-white text-[10px] font-bold uppercase tracking-widest">Camera</span>
            </button>
            <button 
              onClick={() => { fileInputRef.current?.click(); setShowTutorPlusMenu(false); }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white group-hover:bg-white/30 transition-all">
                <ImageIcon size={24} />
              </div>
              <span className="text-white text-[10px] font-bold uppercase tracking-widest">Gallery</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 pb-32 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-1 flex items-center gap-2">
          <button 
            onClick={() => setShowTutorPlusMenu(!showTutorPlusMenu)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showTutorPlusMenu ? 'bg-white text-brand-primary rotate-45' : 'bg-white/10 text-white'}`}
          >
            <Plus size={20} />
          </button>
          <input 
            value={tutorInput}
            onChange={(e) => setTutorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tutorInput.trim()) {
                const userMsg: Message = { id: Date.now().toString(), role: 'user', content: tutorInput, timestamp: Date.now() };
                setTutorMessages(prev => [...prev, userMsg]);
                setTutorInput('');
                // Simulate AI response
                setTimeout(() => {
                  setTutorMessages(prev => [...prev, { 
                    id: (Date.now() + 1).toString(), 
                    role: 'model', 
                    content: 'I am analyzing your request. How else can I assist you?', 
                    timestamp: Date.now() 
                  }]);
                }, 1000);
              }
            }}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/40 py-3"
          />
          <button 
            onClick={() => {
              if (tutorInput.trim()) {
                const userMsg: Message = { id: Date.now().toString(), role: 'user', content: tutorInput, timestamp: Date.now() };
                setTutorMessages(prev => [...prev, userMsg]);
                setTutorInput('');
                setTimeout(() => {
                  setTutorMessages(prev => [...prev, { 
                    id: (Date.now() + 1).toString(), 
                    role: 'model', 
                    content: 'I am analyzing your request. How else can I assist you?', 
                    timestamp: Date.now() 
                  }]);
                }, 1000);
              }
            }}
            className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20"
          >
            <Send size={18} />
          </button>
        </div>
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
        <button 
          onClick={() => {
            if (previousView === 'tutor') {
              setView('tutor');
            } else {
              setView('home');
            }
          }} 
          className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <button className="p-2.5 bg-black/40 backdrop-blur-md rounded-xl text-white">
          <Flashlight size={20} />
        </button>
      </header>

      <div className="mt-auto relative z-10 p-6 pb-32 flex flex-col items-center gap-6">
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
    </div>
  );

  const renderOnboarding = () => {
    const steps = [
      {
        title: "Welcome to Braindoubt",
        desc: "Your personal AI tutor and NCERT library. Let's make learning fun and easy.",
        icon: <Brain size={40} className="text-brand-primary" />,
        color: "bg-brand-primary/20"
      },
      {
        title: "Select your Class",
        desc: "We'll tailor your learning experience and NCERT library based on your current grade.",
        icon: <BookOpen size={40} className="text-emerald-400" />,
        color: "bg-emerald-500/20",
        isClassSelection: true
      }
    ];

    const current = steps[onboardingStep];

    return (
      <div className="flex-1 flex flex-col bg-dark-bg p-8">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <motion.div 
            key={onboardingStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center"
          >
            <div className={`w-24 h-24 ${current.color} rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl`}>
              {current.icon}
            </div>
            <h2 className="text-2xl font-bold mb-4 tracking-tight">{current.title}</h2>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-[280px]">{current.desc}</p>

            {current.isClassSelection && (
              <div className="mt-8 grid grid-cols-4 gap-2 w-full max-w-xs">
                {CLASSES.map(c => (
                  <button 
                    key={c}
                    onClick={() => {
                      setUser(prev => ({ ...prev, class: c }));
                      setLibraryClass(c);
                    }}
                    className={`h-10 rounded-xl font-bold text-xs transition-all border ${user.class === c ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white/5 border-white/5 text-zinc-500'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex justify-center gap-2 mb-4">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === onboardingStep ? 'w-8 bg-brand-primary' : 'w-2 bg-white/10'}`} />
            ))}
          </div>
          
          <button 
            onClick={() => {
              if (onboardingStep < steps.length - 1) {
                setOnboardingStep(onboardingStep + 1);
              } else {
                setView('login');
              }
            }}
            className="w-full py-4 bg-brand-primary text-white font-bold rounded-2xl shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {onboardingStep === steps.length - 1 ? "Get Started" : "Next"}
          </button>
          
          <button 
            onClick={() => setView('login')}
            className="w-full py-2 text-zinc-500 font-bold text-xs hover:text-white transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  };

  const handleManualLogin = async () => {
    setIsLoggingIn('logging_in');
    // Simulate API call
    setTimeout(() => {
      setUser(prev => ({ 
        ...prev,
        name: loginName || loginEmail.split('@')[0] || 'Learner', 
        email: loginEmail,
        isLoggedIn: true 
      }));
      
      setIsLoggingIn(null);
      setIsFirstTime(false);
      setView('home');
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981']
      });
    }, 1500);
  };

  const renderLogin = () => (
    <div className="flex-1 flex flex-col bg-dark-bg p-5">
      <header className="mb-6">
        <button 
          onClick={() => setView('onboarding')} 
          className="p-2 bg-white/5 rounded-lg text-zinc-400"
        >
          <ArrowLeft size={18} />
        </button>
      </header>
      
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {loginStep === 'login' && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-xl font-bold mb-1">Welcome Back</h2>
              <p className="text-zinc-400 text-xs mb-8">Login to continue your learning journey.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 ml-1">Email Address</label>
                  <input 
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-primary/50 focus:ring-0 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 ml-1">Password</label>
                  <input 
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-primary/50 focus:ring-0 transition-all"
                  />
                </div>
                
                <button 
                  onClick={handleManualLogin}
                  disabled={!loginEmail || !loginPassword || !!isLoggingIn}
                  className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  {isLoggingIn ? <Loader2 size={18} className="animate-spin" /> : 'Login'}
                </button>
                
                <p className="text-center text-xs text-zinc-500">
                  Don't have an account? <button onClick={() => setLoginStep('signup')} className="text-brand-primary font-bold">Sign Up</button>
                </p>
              </div>
            </motion.div>
          )}

          {loginStep === 'signup' && (
            <motion.div 
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <h2 className="text-xl font-bold mb-1">Create Account</h2>
              <p className="text-zinc-400 text-xs mb-8">Join thousands of students learning better every day.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 ml-1">Full Name</label>
                  <input 
                    type="text"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-primary/50 focus:ring-0 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 ml-1">Email Address</label>
                  <input 
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-primary/50 focus:ring-0 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 ml-1">Password</label>
                  <input 
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-brand-primary/50 focus:ring-0 transition-all"
                  />
                </div>
                
                <button 
                  onClick={handleManualLogin}
                  disabled={!loginEmail || !loginPassword || !loginName || !!isLoggingIn}
                  className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  {isLoggingIn ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
                </button>
                
                <p className="text-center text-xs text-zinc-500">
                  Already have an account? <button onClick={() => setLoginStep('login')} className="text-brand-primary font-bold">Login</button>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
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
      <div className={`flex-1 flex flex-col ${getThemeClass()} animate-gradient overflow-hidden`}>
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
        
        <div className="flex-1 overflow-y-auto p-3 pt-1 pb-32">
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
    <div className={`flex-1 flex flex-col ${getThemeClass()} animate-gradient overflow-hidden min-h-0 relative`}>
      <div className="flex-1 overflow-y-auto p-6 pb-32 no-scrollbar">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-4 border border-white/20 relative group overflow-hidden">
            <span className="text-5xl">{selectedAvatar}</span>
            <button 
              onClick={() => setShowAvatarPicker(true)}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <Camera size={24} className="text-white" />
            </button>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-success rounded-xl flex items-center justify-center border-4 border-[#0A0B1E]">
              <Check size={16} className="text-black" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-0.5 text-white">{user.name}</h2>
          {user.email && <p className="text-white/60 text-xs mb-1">{user.email}</p>}
          {user.phone && <p className="text-white/60 text-xs mb-1">{user.phone}</p>}
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <p className="px-2 py-0.5 bg-white/10 rounded text-[8px] font-bold text-white/60 uppercase tracking-widest">Class {user.class}</p>
            {user.dob && <p className="px-2 py-0.5 bg-white/10 rounded text-[8px] font-bold text-white/60 uppercase tracking-widest">Born: {new Date(user.dob).toLocaleDateString()}</p>}
            {user.gender && <p className="px-2 py-0.5 bg-white/10 rounded text-[8px] font-bold text-white/60 uppercase tracking-widest">{user.gender}</p>}
          </div>

          <button 
            onClick={() => {
              setEditForm({ name: user.name, dob: user.dob || '', gender: user.gender || '', class: user.class });
              setShowEditProfile(true);
            }}
            className="mt-4 px-4 py-1.5 bg-white/10 border border-white/10 rounded-full text-[10px] font-bold text-white/80 hover:bg-white/20 transition-all"
          >
            Edit Profile
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Theme Selection Section */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 mb-3">
            <h3 className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-4">Appearance</h3>
            <div className="flex items-center justify-between gap-4">
              {[
                { id: 'purple', color: 'bg-purple-500' },
                { id: 'blue', color: 'bg-blue-500' },
                { id: 'emerald', color: 'bg-emerald-500' },
                { id: 'rose', color: 'bg-rose-500' }
              ].map((t) => (
                <button 
                  key={t.id}
                  onClick={() => setTheme(t.id as any)}
                  className={`w-12 h-12 rounded-2xl ${t.color} flex items-center justify-center transition-all ${theme === t.id ? 'ring-4 ring-white scale-110 shadow-xl' : 'opacity-60 hover:opacity-100'}`}
                >
                  {theme === t.id && <Check size={20} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setShowHistory(true)}
            className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/20 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <History size={20} className="text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-white">Study History</p>
                <p className="text-[10px] text-white/40">{sessions.length} sessions completed</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-white/20" />
          </button>
        </div>
        
        <div className="mt-8">
          <button 
            onClick={() => {
              setUser(prev => ({ name: 'Guest Student', class: prev.class, isLoggedIn: false }));
              setView('onboarding');
            }}
            className="w-full py-3 bg-red-500/10 text-red-500 font-bold text-sm rounded-xl border border-red-500/10 flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  const renderBottomNav = () => (
    <div className="absolute bottom-8 left-6 right-6 z-50 flex justify-center pointer-events-none">
      <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-2 flex items-center gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto relative">
        {/* Subtle background glow for the whole bar */}
        <div className="absolute inset-0 rounded-[2.5rem] bg-brand-primary/5 blur-xl -z-10" />
        
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'books', icon: Book, label: 'Books' },
          { id: 'profile', icon: User, label: 'Profile' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => { 
                setActiveTab(tab.id as Tab); 
                setView('home'); 
              }}
              className={`relative flex items-center gap-2 px-6 py-3 rounded-[2rem] transition-all duration-500 ${
                isActive ? 'text-white' : 'text-white/30 hover:text-white/50'
              }`}
            >
              {isActive && (
                <>
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/10 rounded-[2rem] border border-white/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                  <motion.div
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-brand-primary/20 blur-md rounded-[2rem] -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                </>
              )}
              <Icon 
                size={20} 
                className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} 
                fill={isActive ? 'currentColor' : 'none'} 
              />
              <AnimatePresence>
                {isActive && (
                  <motion.span 
                    initial={{ opacity: 0, width: 0, x: -5 }}
                    animate={{ opacity: 1, width: 'auto', x: 0 }}
                    exit={{ opacity: 0, width: 0, x: -5 }}
                    className="text-xs font-bold relative z-10 overflow-hidden whitespace-nowrap"
                  >
                    {tab.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </div>
  );
  const renderSolving = () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg p-8 text-center">
      <div className="relative w-40 h-40 mb-12 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-32 h-32 bg-brand-primary/20 rounded-full blur-2xl"
          />
          <Brain size={80} className="text-brand-primary animate-float relative z-10" />
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-3">AI is Thinking...</h2>
      <p className="text-zinc-400 text-xs max-w-[240px] mx-auto leading-relaxed">Analyzing symbols, logic, and context to provide the best explanation.</p>
    </div>
  );

  const renderCrop = () => (
    <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
      <header className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => {
            if (previousView === 'tutor') {
              setView('tutor');
            } else {
              setView('scan');
            }
          }} 
          className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <h3 className="text-white font-bold">Adjust Crop</h3>
        <div className="w-12" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">
        {capturedImage && (
          <div className="relative flex flex-col items-center gap-4 w-full">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              className="max-h-full"
            >
              <img 
                ref={imgRef}
                src={capturedImage} 
                onLoad={onImageLoad}
                className="max-w-full max-h-[60vh] object-contain"
                alt="Crop source"
              />
            </ReactCrop>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10">
              <button 
                onClick={handleRotate}
                className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Rotate 90°"
              >
                <RotateCw size={20} />
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button 
                onClick={() => setAspect(undefined)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${aspect === undefined ? 'bg-brand-primary text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                Free
              </button>
              <button 
                onClick={() => setAspect(1)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${aspect === 1 ? 'bg-brand-primary text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                1:1
              </button>
              <button 
                onClick={() => setAspect(4/3)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${aspect === 4/3 ? 'bg-brand-primary text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                4:3
              </button>
              <button 
                onClick={() => setAspect(16/9)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${aspect === 16/9 ? 'bg-brand-primary text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                16:9
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-6">
        <p className="text-white/60 text-[10px] font-medium">Drag the corners to adjust the crop area</p>
        
        <button 
          onClick={handleCropConfirm}
          disabled={isLoading}
          className="w-full max-w-xs py-4 bg-brand-primary text-white font-bold rounded-2xl shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
          Confirm & Solve
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

                <AnimatePresence>
                  {showFeedbackInput === m.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 space-y-3 overflow-hidden"
                    >
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
                        What went wrong?
                      </p>
                      
                      <div className="flex flex-wrap gap-2 justify-center">
                        {FEEDBACK_REASONS.map(reason => (
                          <button 
                            key={reason}
                            onClick={() => setFeedbackReason(reason)}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-bold transition-all border ${
                              feedbackReason === reason 
                                ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' 
                                : 'bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10'
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>

                      <textarea 
                        value={feedbackReason}
                        onChange={(e) => setFeedbackReason(e.target.value)}
                        placeholder="Tell us more so we can improve..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-brand-primary/50 focus:ring-0 min-h-[80px] resize-none"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowFeedbackInput(null)}
                          className="flex-1 py-2 rounded-xl bg-white/5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => submitFeedbackReason(m.id)}
                          disabled={!feedbackReason.trim()}
                          className="flex-[2] py-2 rounded-xl bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                        >
                          Submit Feedback
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {m.feedbackReason && !showFeedbackInput && (
                  <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Your Feedback</p>
                    <p className="text-[10px] text-zinc-300 italic">"{m.feedbackReason}"</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 pb-32 bg-dark-surface border-t border-white/5">
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
                <AnimatePresence mode="wait">
                  {activeTab === 'home' && (
                    <motion.div 
                      key="home-tab"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex-1 flex flex-col min-h-0"
                    >
                      {renderHome()}
                    </motion.div>
                  )}
                  {activeTab === 'books' && (
                    <motion.div 
                      key="books-tab"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex-1 flex flex-col min-h-0"
                    >
                      {renderBooks()}
                    </motion.div>
                  )}
                  {activeTab === 'profile' && (
                    <motion.div 
                      key="profile-tab"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex-1 flex flex-col min-h-0"
                    >
                      {renderProfile()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
            
            {view === 'scan' && <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">{renderScan()}</motion.div>}
            {view === 'tutor' && <motion.div key="tutor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">{renderTutor()}</motion.div>}
            {view === 'crop' && <motion.div key="crop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">{renderCrop()}</motion.div>}
            {view === 'solving' && <motion.div key="solving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">{renderSolving()}</motion.div>}
            {view === 'solution' && <motion.div key="solution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">{renderSolution()}</motion.div>}
          </AnimatePresence>
        </div>

        {/* Global Bottom Navigation */}
        <AnimatePresence>
          {['home', 'solution', 'tutor', 'scan'].includes(view) && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative z-50"
            >
              {renderBottomNav()}
            </motion.div>
          )}
        </AnimatePresence>
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
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-dark-surface rounded-[2rem] w-full max-w-md p-6 border border-white/5"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Edit Profile</h3>
                <button onClick={() => setShowEditProfile(false)} className="p-2 text-zinc-500">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Full Name</label>
                  <input 
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:border-brand-primary/50 focus:ring-0"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Date of Birth</label>
                  <input 
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:border-brand-primary/50 focus:ring-0"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Gender</label>
                  <select 
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:border-brand-primary/50 focus:ring-0"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1.5 block">Class</label>
                  <select 
                    value={editForm.class}
                    onChange={(e) => setEditForm({ ...editForm, class: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:border-brand-primary/50 focus:ring-0"
                  >
                    {CLASSES.map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>
                
                <button 
                  onClick={() => {
                    setUser({ ...user, ...editForm });
                    setLibraryClass(editForm.class);
                    setShowEditProfile(false);
                  }}
                  className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl mt-4 shadow-lg shadow-brand-primary/20"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Avatar Picker Modal */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] w-full max-w-xs p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold">Choose Avatar</h3>
                <button onClick={() => setShowAvatarPicker(false)} className="text-white/40">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {avatars.map((a) => (
                  <button 
                    key={a}
                    onClick={() => { setSelectedAvatar(a); setShowAvatarPicker(false); }}
                    className={`text-3xl p-3 rounded-2xl transition-all ${selectedAvatar === a ? 'bg-white/20 scale-110' : 'hover:bg-white/5'}`}
                  >
                    {a}
                  </button>
                ))}
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
        {copiedId === 'feedback_sent' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-indigo-500 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2"
          >
            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
              <Check size={12} />
            </div>
            Thank you for your feedback!
          </motion.div>
        )}
      </AnimatePresence>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
    </div>
  );
}
