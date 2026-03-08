import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  Terminal, 
  Code2, 
  MessageSquare, 
  Play, 
  Settings, 
  Files, 
  Search, 
  Cpu, 
  Zap,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  X,
  Send,
  Sparkles,
  Download,
  Smartphone,
  Monitor,
  Box,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Layout,
  Palette,
  Bug,
  Lightbulb,
  Globe,
  Maximize2,
  Layers,
  FileText,
  RefreshCw,
  ExternalLink,
  PanelRight,
  Trash2,
  History as HistoryIcon,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as tf from '@tensorflow/tfjs';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { getGeminiResponse } from './services/gemini';

// --- Types ---
interface FileNode {
  name: string;
  content: string;
  language: string;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  files: Record<string, FileNode>;
}

const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'react-basic',
    name: 'React App',
    description: 'A clean React starter with Tailwind CSS.',
    icon: Layout,
    files: {
      'App.tsx': {
        name: 'App.tsx',
        language: 'typescript',
        content: `export default function App() {
  return (
    <div className="p-8 min-h-screen bg-zinc-950 text-white font-sans">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Hello Vibe Coder!</h1>
      <p className="mt-4 text-zinc-400">Start vibing to build something amazing.</p>
      <div className="mt-8 p-6 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl">
         <h2 className="text-xl font-semibold">Live Preview</h2>
         <p className="text-sm text-zinc-500 mt-2">This is a real-time preview of your code.</p>
      </div>
    </div>
  );
}`,
      },
      'styles.css': {
        name: 'styles.css',
        language: 'css',
        content: 'body {\n  margin: 0;\n  padding: 0;\n  background: #09090b;\n  color: white;\n}',
      }
    }
  },
  {
    id: 'node-api',
    name: 'Node.js API',
    description: 'Express-style backend structure.',
    icon: Cpu,
    files: {
      'server.ts': {
        name: 'server.ts',
        language: 'typescript',
        content: `import express from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
      },
      'routes.ts': {
        name: 'routes.ts',
        language: 'typescript',
        content: `export const routes = [
  { path: '/', method: 'GET', handler: 'index' },
  { path: '/users', method: 'POST', handler: 'createUser' }
];`,
      }
    }
  },
  {
    id: 'vite-plugin',
    name: 'Vite Plugin',
    description: 'A simple Vite plugin template.',
    icon: Box,
    files: {
      'index.ts': {
        name: 'index.ts',
        language: 'typescript',
        content: `export default function myVitePlugin() {
  return {
    name: 'my-vite-plugin',
    transform(code, id) {
      if (id.endsWith('.vibe')) {
        return {
          code: \`export default \${JSON.stringify(code)}\`,
          map: null
        };
      }
    }
  };
}`,
      },
      'README.md': {
        name: 'README.md',
        language: 'markdown',
        content: '# My Vite Plugin\n\nThis is a template for a Vite plugin.',
      }
    }
  },
  {
    id: 'tailwind-landing',
    name: 'Landing Page',
    description: 'Modern landing page with Tailwind.',
    icon: Palette,
    files: {
      'App.tsx': {
        name: 'App.tsx',
        language: 'typescript',
        content: `export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
      <nav className="p-6 flex justify-between items-center border-b border-white/10">
        <div className="text-xl font-bold tracking-tighter">VIBE.CO</div>
        <div className="flex gap-8 text-sm font-medium text-zinc-400">
          <a href="#" className="hover:text-white transition-colors">Product</a>
          <a href="#" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <button className="px-4 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-zinc-200 transition-all">Get Started</button>
      </nav>
      
      <main className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-7xl font-bold tracking-tight leading-none">
          Build with <span className="text-indigo-500 italic">Vibe</span>
        </h1>
        <p className="mt-8 text-xl text-zinc-500 max-w-2xl mx-auto">
          The next generation development environment that understands your flow and amplifies your creativity.
        </p>
        <div className="mt-12 flex justify-center gap-4">
          <button className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">Start Building</button>
          <button className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-all">View Demo</button>
        </div>
      </main>
    </div>
  );
}`,
      },
      'styles.css': {
        name: 'styles.css',
        language: 'css',
        content: '@import "tailwindcss";',
      }
    }
  }
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; uri: string }[];
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  timestamp: string;
}

type BuildPlatform = 'windows' | 'macos' | 'linux' | 'android' | 'ios';

export default function App() {
  // --- State ---
  const [files, setFiles] = useState<Record<string, FileNode>>({
    'App.tsx': {
      name: 'App.tsx',
      language: 'typescript',
      content: 'export default function App() {\n  return (\n    <div className="p-8 min-h-screen bg-zinc-950 text-white font-sans">\n      <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Hello Vibe Coder!</h1>\n      <p className="mt-4 text-zinc-400">Start vibing to build something amazing.</p>\n      <div className="mt-8 p-6 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl">\n         <h2 className="text-xl font-semibold">Live Preview</h2>\n         <p className="text-sm text-zinc-500 mt-2">This is a real-time preview of your code.</p>\n      </div>\n    </div>\n  );\n}',
    },
    'styles.css': {
      name: 'styles.css',
      language: 'css',
      content: 'body {\n  margin: 0;\n  padding: 0;\n  background: #09090b;\n  color: white;\n}',
    }
  });
  const [activeFile, setActiveFile] = useState('App.tsx');
  const [chatHistory, setChatHistory] = useState<Message[]>(() => {
    const saved = localStorage.getItem('vibecode_chat_history');
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: 'Vibe check complete. I am VibeAI. What are we building today?' }
    ];
  });
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('vibecode_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [vibeLevel, setVibeLevel] = useState(0);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['VibeCode Terminal v1.0.0', 'Ready for input...']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isResearching, setIsResearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'research' | 'components' | 'history' | 'insights'>('chat');
  const [vibeStatus, setVibeStatus] = useState<'Chill' | 'Chaotic' | 'Productive' | 'Zen'>('Chill');
  const [vibeSuggestions, setVibeSuggestions] = useState<{ id: string; type: 'complexity' | 'nesting' | 'documentation' | 'conciseness'; message: string; suggestion: string }[]>([]);
  const [localModelReady, setLocalModelReady] = useState(false);
  const vibeModelRef = useRef<tf.LayersModel | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>(() => {
    const saved = localStorage.getItem('vibecode_selected_sources');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Build System State
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [buildPlatform, setBuildPlatform] = useState<BuildPlatform | null>(null);
  const [buildStatus, setBuildStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const applyTemplate = (template: ProjectTemplate) => {
    setConfirmAction({
      title: 'Apply Template',
      message: `Are you sure you want to apply the "${template.name}" template? This will replace all current files.`,
      onConfirm: () => {
        setFiles(template.files);
        setActiveFile(Object.keys(template.files)[0]);
        setTerminalOutput(prev => [...prev, `> Applied template: ${template.name}`]);
        setIsTemplateModalOpen(false);
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  };

  const downloadProject = async () => {
    try {
      setTerminalOutput(prev => [...prev, '> Preparing project download...']);
      const zip = new JSZip();
      
      Object.entries(files).forEach(([name, file]) => {
        zip.file(name, file.content);
      });
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'vibecode-project.zip');
      setTerminalOutput(prev => [...prev, '> Project downloaded successfully as vibecode-project.zip']);
    } catch (error) {
      console.error('Download error:', error);
      setTerminalOutput(prev => [...prev, `> Error: Failed to download project. ${error}`]);
    }
  };

  // --- TensorFlow Vibe Analysis ---
  useEffect(() => {
    const initModel = async () => {
      if (vibeModelRef.current) return;

      // Create a simple neural network for vibe scoring
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 8, activation: 'relu', inputShape: [6] }));
      model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

      model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

      // Synthetic training data: [length, complexity, nesting, documentation, conciseness, activity]
      // Zen: [0.5, 0.1, 0.1, 0.8, 0.4, 0.5] -> 0.9
      // Productive: [0.6, 0.4, 0.3, 0.4, 0.5, 0.8] -> 0.7
      // Chill: [0.2, 0.1, 0.1, 0.2, 0.3, 0.2] -> 0.5
      // Chaotic: [0.9, 0.9, 0.9, 0.0, 0.9, 0.9] -> 0.1

      const xs = tf.tensor2d([
        [0.5, 0.1, 0.1, 0.8, 0.4, 0.5],
        [0.6, 0.4, 0.3, 0.4, 0.5, 0.8],
        [0.2, 0.1, 0.1, 0.2, 0.3, 0.2],
        [0.9, 0.9, 0.9, 0.0, 0.9, 0.9],
        [0.4, 0.2, 0.2, 0.5, 0.4, 0.4],
        [0.8, 0.7, 0.6, 0.1, 0.8, 0.7]
      ]);
      const ys = tf.tensor2d([[0.9], [0.7], [0.5], [0.1], [0.6], [0.2]]);

      await model.fit(xs, ys, { epochs: 50, verbose: 0 });
      vibeModelRef.current = model;
      setLocalModelReady(true);
      
      xs.dispose();
      ys.dispose();
    };

    initModel();
  }, []);

  useEffect(() => {
    const analyzeVibe = async () => {
      if (!vibeModelRef.current) return;

      const content = files[activeFile].content;
      const lines = content.split('\n');
      
      // 1. Length Metric
      const lengthMetric = Math.min(1, content.length / 5000);
      
      // 2. Complexity Metric (Control Flow)
      const complexityMatches = content.match(/\b(if|else|for|while|switch|case|&&|\|\||\?)\b/g) || [];
      const complexityMetric = Math.min(1, complexityMatches.length / 20);
      
      // 3. Nesting Metric
      let maxNesting = 0;
      let currentNesting = 0;
      for (const char of content) {
        if (char === '{') currentNesting++;
        if (char === '}') currentNesting--;
        maxNesting = Math.max(maxNesting, currentNesting);
      }
      const nestingMetric = Math.min(1, maxNesting / 10);
      
      // 4. Documentation Metric
      const commentCount = (content.match(/\/\//g) || []).length + (content.match(/\/\*[\s\S]*?\*\//g) || []).length;
      const documentationMetric = Math.min(1, commentCount / (lines.length || 1));
      
      // 5. Conciseness (Avg Line Length)
      const avgLineLength = content.length / (lines.length || 1);
      const concisenessMetric = Math.min(1, avgLineLength / 100);
      
      // 6. Activity Metric
      const activityMetric = Math.min(1, input.length / 200);

      // Inference
      const inputTensor = tf.tensor2d([[
        lengthMetric, 
        complexityMetric, 
        nestingMetric, 
        documentationMetric, 
        concisenessMetric, 
        activityMetric
      ]]);
      
      const prediction = vibeModelRef.current.predict(inputTensor) as tf.Tensor;
      const score = (await prediction.data())[0];
      const normalizedScore = Math.floor(score * 100);
      
      setVibeLevel(normalizedScore);
      
      if (normalizedScore > 80) setVibeStatus('Zen');
      else if (normalizedScore > 50) setVibeStatus('Productive');
      else if (normalizedScore > 25) setVibeStatus('Chill');
      else setVibeStatus('Chaotic');

      // Generate Granular Suggestions
      const suggestions: { id: string; type: 'complexity' | 'nesting' | 'documentation' | 'conciseness'; message: string; suggestion: string }[] = [];
      
      if (complexityMetric > 0.6) {
        suggestions.push({
          id: 'complexity-1',
          type: 'complexity',
          message: 'High cyclomatic complexity detected.',
          suggestion: 'Consider breaking down complex conditional logic into smaller, named helper functions or using a state machine pattern.'
        });
      }

      if (nestingMetric > 0.5) {
        suggestions.push({
          id: 'nesting-1',
          type: 'nesting',
          message: 'Deep nesting levels found.',
          suggestion: 'Try using guard clauses (early returns) to flatten your code structure and improve readability.'
        });
      }

      if (documentationMetric < 0.1 && lines.length > 50) {
        suggestions.push({
          id: 'documentation-1',
          type: 'documentation',
          message: 'Low documentation density.',
          suggestion: 'Add JSDoc comments to your main functions and components to explain their purpose and parameters.'
        });
      }

      if (concisenessMetric > 0.8) {
        suggestions.push({
          id: 'conciseness-1',
          type: 'conciseness',
          message: 'Long lines detected.',
          suggestion: 'Break down long expressions or JSX attributes into multiple lines to avoid horizontal scrolling.'
        });
      }

      setVibeSuggestions(suggestions);
      
      inputTensor.dispose();
      prediction.dispose();
    };
    
    if (localModelReady) {
      analyzeVibe();
    }
  }, [input, activeFile, files, localModelReady]);

  // --- Preview Logic ---
  const generatePreviewContent = () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>${files['styles.css'].content}</style>
        </head>
        <body>
          <div id="root"></div>
          <script type="module">
            const content = \`${files['App.tsx'].content}\`;
            const jsxMatch = content.match(/return \\(([^]*)\\);/);
            if (jsxMatch) {
              document.getElementById('root').innerHTML = jsxMatch[1];
            } else {
              document.getElementById('root').innerHTML = '<div class="p-8 text-red-500">Error: Could not find return statement in App.tsx</div>';
            }
          </script>
        </body>
      </html>
    `;
    return html;
  };

  const refreshPreview = () => {
    if (previewRef.current) {
      previewRef.current.srcdoc = generatePreviewContent();
      setTerminalOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Preview refreshed.`]);
    }
  };

  useEffect(() => {
    if (isPreviewOpen) {
      refreshPreview();
    }
  }, [isPreviewOpen, files]);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('vibecode_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('vibecode_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('vibecode_selected_sources', JSON.stringify(selectedSources));
  }, [selectedSources]);

  const saveCurrentSession = () => {
    if (chatHistory.length <= 1) return;
    
    const newSession: ChatSession = {
      id: Date.now().toString(),
      name: chatHistory.find(m => m.role === 'user')?.content.substring(0, 30) || `Session ${sessions.length + 1}`,
      messages: [...chatHistory],
      timestamp: new Date().toLocaleString(),
    };
    
    setSessions(prev => [newSession, ...prev]);
    setTerminalOutput(prev => [...prev, `> Session "${newSession.name}" saved to local storage.`]);
  };

  const loadSession = (session: ChatSession) => {
    setChatHistory(session.messages);
    setActiveSessionId(session.id);
    setTerminalOutput(prev => [...prev, `> Loaded session: ${session.name}`]);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  };

  const clearHistory = () => {
    setConfirmAction({
      title: 'Clear Chat History',
      message: 'This will reset the current conversation. Saved sessions will remain intact. Continue?',
      onConfirm: () => {
        setChatHistory([{ role: 'assistant', content: 'Vibe check complete. I am VibeAI. What are we building today?' }]);
        setSelectedSources([]);
        localStorage.removeItem('vibecode_chat_history');
        localStorage.removeItem('vibecode_selected_sources');
        setTerminalOutput(prev => [...prev, '> Current chat history cleared.']);
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  };

  // --- Handlers ---
  const handleSend = async (customPrompt?: string) => {
    const promptToUse = customPrompt || input;
    if (!promptToUse.trim()) return;

    const userMsg: Message = { role: 'user', content: promptToUse };
    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setIsResearching(true);

    try {
      const history = chatHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      const { text, sources } = await getGeminiResponse(promptToUse, files[activeFile].content, history, selectedSources);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: text || 'I am vibing but couldn\'t generate a response.',
        sources
      }]);
      setTerminalOutput(prev => [...prev, `> AI suggested changes for ${activeFile}`]);
      if (sources && sources.length > 0) {
        setTerminalOutput(prev => [...prev, `> Research complete: Found ${sources.length} sources.`]);
        setActiveTab('research');
      }
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Vibe check failed. Check your connection.' }]);
    } finally {
      setIsTyping(false);
      setIsResearching(false);
    }
  };

  const toggleSource = (uri: string) => {
    setSelectedSources(prev => 
      prev.includes(uri) ? prev.filter(s => s !== uri) : [...prev, uri]
    );
  };

  const clearContext = () => {
    setSelectedSources([]);
  };

  const handleApplyCode = (code: string) => {
    setFiles(prev => ({
      ...prev,
      [activeFile]: {
        ...prev[activeFile],
        content: code
      }
    }));
    setTerminalOutput(prev => [...prev, `> Applied AI changes to ${activeFile}`]);
  };

  const createNewFile = () => {
    setIsNewFileModalOpen(true);
    setNewFileName('');
  };

  const handleCreateFile = () => {
    const name = newFileName.trim();
    if (name && !files[name]) {
      const ext = name.split('.').pop() || 'txt';
      const lang = ext === 'ts' || ext === 'tsx' ? 'typescript' : ext === 'js' ? 'javascript' : ext;
      setFiles(prev => ({
        ...prev,
        [name]: {
          name,
          language: lang,
          content: '// New file created\n'
        }
      }));
      setActiveFile(name);
      setTerminalOutput(prev => [...prev, `> Created new file: ${name}`]);
      setIsNewFileModalOpen(false);
      setNewFileName('');
    }
  };

  const deleteFile = (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (Object.keys(files).length <= 1) {
      setTerminalOutput(prev => [...prev, `> Error: Cannot delete the last remaining file.`]);
      return;
    }

    setConfirmAction({
      title: 'Delete File',
      message: `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      onConfirm: () => {
        const newFiles = { ...files };
        delete newFiles[fileName];
        setFiles(newFiles);
        if (activeFile === fileName) {
          setActiveFile(Object.keys(newFiles)[0]);
        }
        setTerminalOutput(prev => [...prev, `> Deleted file: ${fileName}`]);
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  };

  const startNativeBuild = async (platform: BuildPlatform) => {
    setBuildPlatform(platform);
    setBuildStatus('compiling');
    setBuildProgress(0);
    setBuildLogs([`Initializing Native Build for ${platform.toUpperCase()}...`]);

    const steps = [
      'Analyzing project structure...',
      'Optimizing UI/UX assets...',
      'Bundling dependencies...',
      'Transpiling source code...',
      'Generating native bindings...',
      'Compiling binary artifacts...',
      'Signing application package...',
      'Finalizing distribution build...'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
      setBuildProgress(((i + 1) / steps.length) * 100);
      setBuildLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${steps[i]}`]);
    }

    setBuildStatus('success');
    setBuildLogs(prev => [...prev, `Build Successful! ${platform.toUpperCase()} package ready.`]);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-zinc-200 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* --- Left Activity Bar --- */}
      <div className="w-12 flex flex-col items-center py-4 border-r border-zinc-800 gap-6 bg-[#0c0c0e]">
        <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
          <Zap className="w-5 h-5 text-white fill-current" />
        </div>
        <div className="flex flex-col gap-4 mt-4">
          <Files className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
          <Search className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
          <Box 
            className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer transition-colors" 
            onClick={() => setIsBuildModalOpen(true)}
          />
          <Layout 
            className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer transition-colors" 
            onClick={() => setIsTemplateModalOpen(true)}
          />
          <Cpu className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
        </div>
        <div className="mt-auto flex flex-col gap-4">
          <Settings className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>

      {/* --- File Explorer Sidebar --- */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-zinc-800 bg-[#0c0c0e] flex flex-col"
          >
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Explorer</span>
              <Plus 
                className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer" 
                onClick={createNewFile}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-2">
              <div className="flex items-center gap-2 p-2 text-sm text-zinc-400 hover:bg-zinc-800/50 rounded cursor-pointer group">
                <ChevronDown className="w-4 h-4" />
                <span className="font-medium">src</span>
              </div>
              <div className="ml-4 flex flex-col gap-1">
                {Object.keys(files).map(fileName => (
                  <div 
                    key={fileName}
                    onClick={() => setActiveFile(fileName)}
                    className={cn(
                      "flex items-center justify-between p-2 text-sm rounded cursor-pointer transition-all group/file",
                      activeFile === fileName ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:bg-zinc-800/50"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Code2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">{fileName}</span>
                    </div>
                    <Trash2 
                      className="w-3 h-3 text-zinc-600 hover:text-red-400 opacity-0 group-hover/file:opacity-100 transition-all" 
                      onClick={(e) => deleteFile(fileName, e)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Main Workspace Area --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        {/* Workspace Header */}
        <div className="h-10 border-b border-zinc-800 flex items-center bg-[#0c0c0e] px-2 gap-1">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#09090b] border-t-2 border-indigo-500 text-sm rounded-t-md">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span>{activeFile}</span>
            <X className="w-3 h-3 text-zinc-500 hover:text-white cursor-pointer ml-2" />
          </div>
          <div className="ml-auto flex items-center gap-3 px-4">
            <button 
              onClick={downloadProject}
              className="flex items-center gap-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-all group"
              title="Download Project as ZIP"
            >
              <Download className="w-3 h-3 group-hover:text-indigo-400" />
              <span>Save to Disk</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                vibeStatus === 'Zen' ? "bg-emerald-500" : 
                vibeStatus === 'Productive' ? "bg-indigo-500" :
                vibeStatus === 'Chill' ? "bg-amber-500" : "bg-red-500"
              )} />
              <span>{vibeStatus} Vibe: {vibeLevel}%</span>
            </div>
            <button 
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-md transition-all border",
                isPreviewOpen 
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/50" 
                  : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
              )}
            >
              <PanelRight className="w-3 h-3" />
              Preview
            </button>
            <button 
              onClick={() => setIsBuildModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-md transition-all border border-zinc-700"
            >
              <Download className="w-3 h-3" />
              Native Build
            </button>
            <button 
              onClick={refreshPreview}
              className="flex items-center gap-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-md transition-all shadow-lg shadow-indigo-500/20"
            >
              <Play className="w-3 h-3 fill-current" />
              Run
            </button>
          </div>
        </div>

        {/* Editor & Preview Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className={cn("flex-1 relative transition-all duration-300", isPreviewOpen ? "w-1/2" : "w-full")}>
            <Editor
              height="100%"
              theme="vs-dark"
              language={files[activeFile].language}
              value={files[activeFile].content}
              onChange={(val) => setFiles(prev => ({ ...prev, [activeFile]: { ...prev[activeFile], content: val || '' } }))}
              onMount={(editor, monaco) => {
                // Local Autocomplete Provider (Privacy-First)
                monaco.languages.registerCompletionItemProvider('typescript', {
                  provideCompletionItems: (model, position) => {
                    const word = model.getWordUntilPosition(position);
                    const range = {
                      startLineNumber: position.lineNumber,
                      endLineNumber: position.lineNumber,
                      startColumn: word.startColumn,
                      endColumn: word.endColumn,
                    };
                    
                    // Simple local dictionary from current file
                    const text = model.getValue();
                    const words = Array.from(new Set(text.match(/\b\w+\b/g) || []));
                    
                    const suggestions = words.map(w => ({
                      label: w,
                      kind: monaco.languages.CompletionItemKind.Text,
                      insertText: w,
                      range: range,
                    }));

                    return { suggestions };
                  },
                });
              }}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 20 },
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 3,
              }}
            />
          </div>

          {/* Preview Pane */}
          <AnimatePresence>
            {isPreviewOpen && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '50%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-l border-zinc-800 bg-white flex flex-col"
              >
                <div className="h-8 bg-[#0c0c0e] border-b border-zinc-800 flex items-center px-4 justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 text-zinc-500" />
                    <span className="text-[10px] font-mono text-zinc-500">localhost:3000</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <RefreshCw 
                      className="w-3 h-3 text-zinc-500 hover:text-white cursor-pointer transition-colors" 
                      onClick={refreshPreview}
                    />
                    <ExternalLink className="w-3 h-3 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
                    <Maximize2 className="w-3 h-3 text-zinc-500 hover:text-white cursor-pointer transition-colors" />
                  </div>
                </div>
                <div className="flex-1 bg-white relative">
                  <iframe 
                    ref={previewRef}
                    title="Preview"
                    className="w-full h-full border-none"
                    sandbox="allow-scripts"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Terminal */}
        <div className="h-48 border-t border-zinc-800 bg-[#0c0c0e] flex flex-col">
          <div className="h-8 border-b border-zinc-800 flex items-center px-4 gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 border-b-2 border-indigo-500 h-full px-1">
              <Terminal className="w-3 h-3" />
              Terminal
            </div>
            <div className="text-xs font-semibold text-zinc-600 hover:text-zinc-400 cursor-pointer h-full px-1 flex items-center">
              Output
            </div>
            <div className="text-xs font-semibold text-zinc-600 hover:text-zinc-400 cursor-pointer h-full px-1 flex items-center">
              Debug Console
            </div>
          </div>
          <div className="flex-1 p-4 font-mono text-xs text-zinc-400 overflow-y-auto">
            {terminalOutput.map((line, i) => (
              <div key={i} className="mb-1">{line}</div>
            ))}
            <div className="flex gap-2">
              <span className="text-indigo-500">➜</span>
              <input 
                className="bg-transparent border-none outline-none text-zinc-200 w-full" 
                placeholder="Type a command..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    setTerminalOutput(prev => [...prev, `➜ ${val}`, `Command not found: ${val}`]);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- Right AI Chat Sidebar --- */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-zinc-800 bg-[#0c0c0e] flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0f0f12]">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={cn(
                    "flex items-center gap-2 pb-4 pt-1 px-1 transition-all relative",
                    activeTab === 'chat' ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-semibold text-sm">Chat</span>
                  {activeTab === 'chat' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />}
                </button>
                <button 
                  onClick={() => setActiveTab('research')}
                  className={cn(
                    "flex items-center gap-2 pb-4 pt-1 px-1 transition-all relative",
                    activeTab === 'research' ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Globe className="w-4 h-4" />
                  <span className="font-semibold text-sm">Research</span>
                  {activeTab === 'research' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />}
                </button>
                <button 
                  onClick={() => setActiveTab('components')}
                  className={cn(
                    "flex items-center gap-2 pb-4 pt-1 px-1 transition-all relative",
                    activeTab === 'components' ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Zap className="w-4 h-4" />
                  <span className="font-semibold text-sm">Vibe Lib</span>
                  {activeTab === 'components' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />}
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "flex items-center gap-2 pb-4 pt-1 px-1 transition-all relative",
                    activeTab === 'history' ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <HistoryIcon className="w-4 h-4" />
                  <span className="font-semibold text-sm">History</span>
                  {activeTab === 'history' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />}
                </button>
                <button 
                  onClick={() => setActiveTab('insights')}
                  className={cn(
                    "flex items-center gap-2 pb-4 pt-1 px-1 transition-all relative",
                    activeTab === 'insights' ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold text-sm">Insights</span>
                  {activeTab === 'insights' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={clearHistory}
                  className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Clear History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <X 
                  className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer" 
                  onClick={() => setIsChatOpen(false)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'chat' ? (
                <div className="space-y-4">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
                      <div className="p-4 bg-zinc-900 rounded-full">
                        <Zap className="w-8 h-8 text-indigo-500" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold">What are we building today?</h3>
                        <p className="text-xs text-zinc-500 max-w-[240px] mx-auto">
                          I can help with full-app building, UI/UX design, and native compilation.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 w-full px-4">
                        {[
                          { icon: Layout, label: 'Build Website', prompt: 'Build a modern landing page for a SaaS product' },
                          { icon: Smartphone, label: 'Mobile App', prompt: 'Design a fitness tracking mobile app with charts' },
                          { icon: Bug, label: 'Fix Errors', prompt: 'Analyze my code for potential bugs and fix them' },
                          { icon: Lightbulb, label: 'Ideate', prompt: 'Give me 5 creative app ideas for productivity' },
                        ].map((item, i) => (
                          <button 
                            key={i}
                            onClick={() => handleSend(item.prompt)}
                            className="flex flex-col items-center gap-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all group"
                          >
                            <item.icon className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400" />
                            <span className="text-[10px] font-medium text-zinc-400">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex flex-col gap-2 max-w-[95%]",
                        msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "p-4 rounded-2xl text-sm leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10" 
                          : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none"
                      )}>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <Markdown
                            components={{
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeContent = String(children).replace(/\n$/, '');
                                return !inline ? (
                                  <div className="relative group/code my-4">
                                    <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity flex gap-2">
                                      <button 
                                        onClick={() => handleApplyCode(codeContent)}
                                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded shadow-lg"
                                      >
                                        Apply to {activeFile}
                                      </button>
                                    </div>
                                    <pre className="p-4 bg-black rounded-xl overflow-x-auto border border-zinc-800 font-mono text-xs">
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  </div>
                                ) : (
                                  <code className="px-1.5 py-0.5 bg-zinc-800 rounded text-indigo-400 font-mono text-xs" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {msg.content}
                          </Markdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 items-center text-zinc-500 text-xs">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        <span>{isResearching ? "VibeAI is researching..." : "VibeAI is thinking..."}</span>
                      </div>
                      {isResearching && (
                        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            className="w-1/3 h-full bg-indigo-500/50"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : activeTab === 'research' ? (
                <div className="space-y-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Research Context</h3>
                    <div className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] rounded-full border border-indigo-500/20">
                      Google Search Enabled
                    </div>
                  </div>
                  
                  {chatHistory.some(m => m.sources && m.sources.length > 0) ? (
                    <div className="space-y-4">
                      {chatHistory.filter(m => m.sources && m.sources.length > 0).map((msg, i) => (
                        <div key={i} className="space-y-3">
                          <p className="text-[10px] text-zinc-600 font-medium italic">From: "{msg.content.substring(0, 40)}..."</p>
                          <div className="grid grid-cols-1 gap-2">
                            {msg.sources?.map((source, idx) => (
                              <div 
                                key={idx}
                                className={cn(
                                  "flex items-start gap-3 p-3 bg-zinc-900/50 border rounded-xl transition-all group relative",
                                  selectedSources.includes(source.uri) ? "border-indigo-500/50 bg-indigo-500/5" : "border-zinc-800 hover:bg-zinc-800"
                                )}
                              >
                                <div 
                                  className="p-2 bg-zinc-800 rounded-lg group-hover:bg-indigo-500/10 transition-colors cursor-pointer"
                                  onClick={() => toggleSource(source.uri)}
                                >
                                  {selectedSources.includes(source.uri) ? (
                                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                  ) : (
                                    <Globe className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleSource(source.uri)}>
                                  <p className="text-xs font-semibold text-zinc-300 truncate">{source.title}</p>
                                  <p className="text-[10px] text-zinc-600 truncate mt-1">{source.uri}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <a href={source.uri} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3 h-3 text-zinc-700 hover:text-zinc-400" />
                                  </a>
                                  <button 
                                    onClick={() => toggleSource(source.uri)}
                                    className={cn(
                                      "text-[10px] font-bold uppercase tracking-tighter transition-colors",
                                      selectedSources.includes(source.uri) ? "text-indigo-400" : "text-zinc-600 hover:text-zinc-400"
                                    )}
                                  >
                                    {selectedSources.includes(source.uri) ? 'Added' : 'Add'}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                      <Search className="w-8 h-8 text-zinc-700" />
                      <p className="text-xs text-zinc-600">No research data available yet.<br/>Ask VibeAI to look something up!</p>
                    </div>
                  )}
                </div>
              ) : activeTab === 'history' ? (
                <div className="space-y-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Saved Sessions</h3>
                    <button 
                      onClick={saveCurrentSession}
                      className="px-3 py-1 bg-indigo-600/20 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-500/30 hover:bg-indigo-600/30 transition-all"
                    >
                      Save Current
                    </button>
                  </div>
                  
                  {sessions.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                      <Clock className="w-8 h-8 text-zinc-600" />
                      <p className="text-xs text-zinc-500 max-w-[200px]">No saved sessions yet. Your current chat is automatically persisted, but you can save snapshots here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div 
                          key={session.id} 
                          className={cn(
                            "p-3 border rounded-xl transition-all group relative cursor-pointer",
                            activeSessionId === session.id ? "bg-indigo-500/10 border-indigo-500/50" : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800"
                          )}
                          onClick={() => loadSession(session)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-zinc-200 truncate">{session.name}</p>
                              <p className="text-[10px] text-zinc-500 mt-1">{session.timestamp}</p>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(session.id);
                              }}
                              className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === 'insights' ? (
                <div className="space-y-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Vibe Insights</h3>
                    <div className={cn(
                      "px-2 py-0.5 text-[10px] rounded-full border",
                      vibeStatus === 'Zen' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      vibeStatus === 'Productive' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                      vibeStatus === 'Chill' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      {vibeStatus} Mode
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Overall Vibe Score</span>
                      <span className="text-sm font-bold text-white">{vibeLevel}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${vibeLevel}%` }}
                        className={cn(
                          "h-full",
                          vibeStatus === 'Zen' ? "bg-emerald-500" :
                          vibeStatus === 'Productive' ? "bg-indigo-500" :
                          vibeStatus === 'Chill' ? "bg-amber-500" :
                          "bg-red-500"
                        )}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      {vibeStatus === 'Zen' ? "Your code is exceptionally clean and well-structured. Keep this flow!" :
                       vibeStatus === 'Productive' ? "Great momentum. Focus on maintaining this pace while keeping complexity in check." :
                       vibeStatus === 'Chill' ? "Steady progress. Consider adding more depth or documentation to your work." :
                       "High entropy detected. It might be time for a quick refactor to regain control."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Refactoring Suggestions</h4>
                    {vibeSuggestions.length === 0 ? (
                      <div className="p-4 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl text-center">
                        <p className="text-xs text-zinc-600">No critical refactors suggested. Your code vibe is solid!</p>
                      </div>
                    ) : (
                      vibeSuggestions.map((s) => (
                        <div key={s.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2 group hover:border-indigo-500/30 transition-all">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1 rounded",
                              s.type === 'complexity' ? "bg-red-500/10 text-red-400" :
                              s.type === 'nesting' ? "bg-amber-500/10 text-amber-400" :
                              s.type === 'documentation' ? "bg-indigo-500/10 text-indigo-400" :
                              "bg-blue-500/10 text-blue-400"
                            )}>
                              {s.type === 'complexity' ? <Zap className="w-3 h-3" /> :
                               s.type === 'nesting' ? <Layers className="w-3 h-3" /> :
                               s.type === 'documentation' ? <FileText className="w-3 h-3" /> :
                               <Maximize2 className="w-3 h-3" />}
                            </div>
                            <span className="text-xs font-bold text-zinc-300">{s.message}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-relaxed pl-7">
                            {s.suggestion}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 py-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Cpu className="w-3 h-3" />
                    Local Vibe Components
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-indigo-500/50 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                          <Monitor className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-sm font-bold text-white group-hover:text-indigo-400">Webcam Filter</span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-3">Real-time on-device face detection and filters.</p>
                      <button 
                        onClick={() => setFiles(prev => ({
                          ...prev,
                          'App.tsx': {
                            ...prev['App.tsx'],
                            content: prev['App.tsx'].content + '\n\n// TODO: Add TF.js Webcam Filter Logic'
                          }
                        }))}
                        className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:underline"
                      >
                        Add to Project
                      </button>
                    </div>
                    
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-indigo-500/50 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                          <MessageSquare className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-sm font-bold text-white group-hover:text-emerald-400">Sentiment Analyzer</span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-3">Analyze text emotion entirely offline.</p>
                      <button className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest hover:underline">
                        Add to Project
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-[#0f0f12] border-t border-zinc-800">
              {selectedSources.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                  <div className="w-full flex justify-between items-center mb-1 px-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Context ({selectedSources.length})</span>
                    <button onClick={clearContext} className="text-[10px] text-zinc-500 hover:text-white transition-colors">Clear All</button>
                  </div>
                  {selectedSources.map((uri, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[10px] text-indigo-300">
                      <Globe className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{uri.split('/').pop() || uri}</span>
                      <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => toggleSource(uri)} />
                    </div>
                  ))}
                </div>
              )}
              <div className="relative group">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Describe what you want to build..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none min-h-[80px] placeholder:text-zinc-600"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="absolute bottom-3 right-3 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Native Build Modal --- */}
      <AnimatePresence>
        {isBuildModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBuildModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0c0c0e] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-[#0f0f12]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl">
                    <Box className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Native Compilation Engine</h2>
                    <p className="text-xs text-zinc-500">Compile your project for Desktop and Mobile platforms</p>
                  </div>
                </div>
                <X 
                  className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer" 
                  onClick={() => setIsBuildModalOpen(false)}
                />
              </div>

              <div className="p-6">
                {buildStatus === 'idle' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                          <Monitor className="w-3 h-3" />
                          Desktop Platforms
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'windows', label: 'Windows (.exe)', icon: '🪟' },
                            { id: 'macos', label: 'macOS (.dmg)', icon: '🍎' },
                            { id: 'linux', label: 'Linux (.AppImage)', icon: '🐧' },
                          ].map((p) => (
                            <button 
                              key={p.id}
                              onClick={() => startNativeBuild(p.id as BuildPlatform)}
                              className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-800 transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{p.icon}</span>
                                <span className="text-sm font-medium">{p.label}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                          <Smartphone className="w-3 h-3" />
                          Mobile Platforms
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'android', label: 'Android (.apk)', icon: '🤖' },
                            { id: 'ios', label: 'iOS (.ipa)', icon: '📱' },
                          ].map((p) => (
                            <button 
                              key={p.id}
                              onClick={() => startNativeBuild(p.id as BuildPlatform)}
                              className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-800 transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{p.icon}</span>
                                <span className="text-sm font-medium">{p.label}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex gap-3">
                      <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        VibeCode uses a cloud-based build pipeline to package your web code into native containers using Electron and Capacitor.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {buildStatus === 'compiling' ? (
                          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        )}
                        <span className="font-semibold">
                          {buildStatus === 'compiling' ? `Compiling for ${buildPlatform?.toUpperCase()}` : 'Build Complete'}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-zinc-500">{Math.floor(buildProgress)}%</span>
                    </div>

                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${buildProgress}%` }}
                        className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      />
                    </div>

                    <div className="h-48 bg-black rounded-xl p-4 font-mono text-[10px] text-zinc-500 overflow-y-auto border border-zinc-800">
                      {buildLogs.map((log, i) => (
                        <div key={i} className="mb-1">{log}</div>
                      ))}
                    </div>

                    {buildStatus === 'success' && (
                      <div className="flex gap-3">
                        <button 
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
                        >
                          <Download className="w-4 h-4" />
                          Download {buildPlatform?.toUpperCase()} Package
                        </button>
                        <button 
                          onClick={() => {
                            setBuildStatus('idle');
                            setBuildProgress(0);
                            setBuildLogs([]);
                          }}
                          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-semibold transition-all"
                        >
                          New Build
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Template Modal --- */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTemplateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0c0c0e] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-[#0f0f12]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl">
                    <Layout className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Project Templates</h2>
                    <p className="text-xs text-zinc-500">Kickstart your next big idea with a pre-configured vibe.</p>
                  </div>
                </div>
                <X 
                  className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer" 
                  onClick={() => setIsTemplateModalOpen(false)}
                />
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="flex flex-col items-start text-left p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-indigo-500/50 transition-all group"
                  >
                    <div className="p-2 bg-zinc-800 rounded-lg mb-4 group-hover:bg-indigo-500/10 transition-colors">
                      <template.icon className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-white mb-1 text-sm">{template.name}</h3>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">{template.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400 opacity-0 group-hover:opacity-100 transition-all">
                      <span>Use Template</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end">
                <button 
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- New File Modal --- */}
      <AnimatePresence>
        {isNewFileModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewFileModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-[#0f0f12]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl">
                    <Plus className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-bold">Create New File</h2>
                </div>
                <X 
                  className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer" 
                  onClick={() => setIsNewFileModalOpen(false)}
                />
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">File Name</label>
                  <input 
                    autoFocus
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                    placeholder="e.g. utils.ts, styles.css"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleCreateFile}
                    disabled={!newFileName.trim() || !!files[newFileName.trim()]}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Create File
                  </button>
                  <button 
                    onClick={() => setIsNewFileModalOpen(false)}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
                {newFileName.trim() && files[newFileName.trim()] && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    A file with this name already exists.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Confirmation Modal --- */}
      <AnimatePresence>
        {isConfirmModalOpen && confirmAction && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0c0c0e] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <AlertCircle className="w-6 h-6" />
                <h3 className="text-lg font-bold text-white">{confirmAction.title}</h3>
              </div>
              <p className="text-sm text-zinc-400">{confirmAction.message}</p>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmAction.onConfirm}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-500/20"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
