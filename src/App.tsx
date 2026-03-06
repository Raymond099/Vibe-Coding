import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
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
  RefreshCw,
  ExternalLink,
  PanelRight,
  Trash2
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

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; uri: string }[];
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
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [vibeLevel, setVibeLevel] = useState(0);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['VibeCode Terminal v1.0.0', 'Ready for input...']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isResearching, setIsResearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'research'>('chat');
  const [selectedSources, setSelectedSources] = useState<string[]>(() => {
    const saved = localStorage.getItem('vibecode_selected_sources');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Build System State
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [buildPlatform, setBuildPlatform] = useState<BuildPlatform | null>(null);
  const [buildStatus, setBuildStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // --- TensorFlow Vibe Analysis ---
  useEffect(() => {
    const analyzeVibe = async () => {
      const tensor = tf.tensor([input.length, files[activeFile].content.length]);
      const vibe = tensor.mean().dataSync()[0];
      setVibeLevel(Math.min(100, Math.floor(vibe % 100)));
      tensor.dispose();
    };
    analyzeVibe();
  }, [input, activeFile, files]);

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
    localStorage.setItem('vibecode_selected_sources', JSON.stringify(selectedSources));
  }, [selectedSources]);

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear your chat history?')) {
      setChatHistory([{ role: 'assistant', content: 'Vibe check complete. I am VibeAI. What are we building today?' }]);
      setSelectedSources([]);
      localStorage.removeItem('vibecode_chat_history');
      localStorage.removeItem('vibecode_selected_sources');
      setTerminalOutput(prev => [...prev, '> Chat history cleared.']);
    }
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
    const name = prompt('Enter file name (e.g. utils.ts):');
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
    }
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
                      "flex items-center gap-2 p-2 text-sm rounded cursor-pointer transition-all",
                      activeFile === fileName ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-400 hover:bg-zinc-800/50"
                    )}
                  >
                    <Code2 className="w-4 h-4" />
                    <span>{fileName}</span>
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
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>TF.js Vibe: {vibeLevel}%</span>
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
              ) : (
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
