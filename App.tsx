import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateWritingAssistance } from './services/geminiService';
import {
  IconDoc, IconUndo, IconRedo, IconPrint, IconFormatPaint, IconZoom,
  IconBold, IconItalic, IconUnderline, IconAlignLeft, IconAlignCenter,
  IconAlignRight, IconListBullet, IconListNumber, IconLink, IconImage,
  IconComment, IconSparkle, IconMoreVertical, IconShare, IconStar, IconDrive, IconCloudDone
} from './components/Icons';

// --- Constants ---
const MENUS = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Extensions', 'Help'];
const FONTS = ['Arial', 'Roboto', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
const FONT_SIZES = ['8', '10', '11', '12', '14', '18', '24', '30', '36', '48', '60', '72'];

// --- Components ---

const Separator = () => <div className="w-[1px] h-5 bg-gray-300 mx-1 self-center" />;

const ToolbarButton = ({ 
  children, 
  onClick, 
  active = false, 
  tooltip, 
  hasDropdown = false 
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  active?: boolean, 
  tooltip?: string,
  hasDropdown?: boolean 
}) => (
  <button 
    className={`
      flex items-center justify-center min-w-[30px] h-[30px] rounded-[4px] px-1 mx-[1px]
      transition-colors duration-100 text-icon-gray
      ${active ? 'bg-blue-100 text-google-blue' : 'hover:bg-gray-200'}
    `}
    onClick={onClick}
    title={tooltip}
  >
    {children}
    {hasDropdown && <span className="text-[10px] ml-1">▼</span>}
  </button>
);

// --- Main App ---

export default function App() {
  const [title, setTitle] = useState('Untitled document');
  // We use content state mainly for initial load, editor is largely uncontrolled
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  
  // Stats State
  const [stats, setStats] = useState({ words: 0, chars: 0 });
  
  // Editor Ref & Save Timer
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // --- Persistence & Stats ---
  
  const updateStats = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || "";
      // Match non-whitespace sequences for word count
      const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
      const chars = text.length;
      setStats({ words, chars });
    }
  }, []);

  useEffect(() => {
    // Load initial state
    const savedContent = localStorage.getItem('docylit-content');
    const savedTitle = localStorage.getItem('docylit-title');
    
    if (savedTitle) setTitle(savedTitle);
    if (savedContent) {
        setContent(savedContent);
    }
    
    // Set initial content in ref
    if (editorRef.current) {
      editorRef.current.innerHTML = savedContent || '<p><br></p>';
      updateStats();
    }
  }, [updateStats]);

  // Debounced Save Function
  const handleInput = () => {
    updateStats();
    setIsSaving(true);
    
    // Clear existing timer
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    // Set new timer for 1 second
    saveTimeoutRef.current = setTimeout(() => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            localStorage.setItem('docylit-content', html);
            localStorage.setItem('docylit-title', title);
            setLastSaved(new Date());
            setIsSaving(false);
        }
    }, 1000);
  };

  // Save title changes immediately
  useEffect(() => {
      localStorage.setItem('docylit-title', title);
  }, [title]);

  // --- Formatting Handlers ---

  const format = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput(); // Trigger save and stats update on format
  };

  // --- AI Handlers ---

  const handleAiRequest = async (mode: 'continue' | 'summarize' | 'fix' | 'tone' | 'custom' = 'continue') => {
    if (!aiPrompt && mode === 'continue') return;
    setAiLoading(true);
    setAiResponse(null);
    
    const context = window.getSelection()?.toString() || editorRef.current?.innerText || "";
    
    // Determine the best prompt based on mode if user hasn't typed one
    let promptToSend = aiPrompt;
    if (!promptToSend) {
        switch (mode) {
            case 'summarize': promptToSend = "Summarize this text concisely."; break;
            case 'fix': promptToSend = "Fix grammar, spelling, and punctuation errors."; break;
            case 'tone': promptToSend = "Rewrite this to sound more professional and concise."; break;
            case 'continue': promptToSend = "Continue writing naturally based on the context."; break;
            default: promptToSend = "Help me write."; break;
        }
    }
    
    try {
      const result = await generateWritingAssistance(promptToSend, context, mode);
      setAiResponse(result);
    } catch (e) {
      setAiResponse("Error generating content. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const insertAiContent = () => {
    if (aiResponse) {
      editorRef.current?.focus();
      document.execCommand('insertText', false, aiResponse);
      setAiResponse(null);
      setAiPrompt('');
      setShowAiModal(false);
      handleInput(); // Trigger save and stats update
    }
  };

  return (
    <div className="flex flex-col h-screen bg-google-gray-bg text-[#1f1f1f] font-sans">
      
      {/* --- HEADER --- */}
      <header id="app-header" className="flex flex-col bg-white border-b border-[#dadce0] print:hidden">
        <div className="flex items-center px-4 pt-3 pb-1">
          {/* Logo */}
          <div className="mr-4 cursor-pointer">
            <IconDoc />
          </div>
          
          {/* Title & Menu */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-0.5">
              <input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-medium text-[18px] text-gray-700 hover:border-gray-400 border border-transparent rounded px-1.5 py-0.5 focus:border-google-blue focus:ring-2 focus:ring-google-blue/30 focus:outline-none transition-colors w-64"
                placeholder="Untitled document"
              />
              <div className="flex items-center space-x-3 text-gray-500">
                <button title="Star" className="hover:bg-gray-100 p-1 rounded-full"><IconStar /></button>
                <button title="Move" className="hover:bg-gray-100 p-1 rounded-full"><IconDrive /></button>
                <button title="Document Status" className="hover:bg-gray-100 p-1 rounded-full"><IconCloudDone /></button>
                <span className="text-xs text-gray-400 hidden lg:inline">{isSaving ? 'Saving...' : 'Saved to localStorage'}</span>
              </div>
            </div>
            {/* Menu Bar */}
            <div className="flex items-center space-x-1 text-[14px] text-gray-700 select-none">
              {MENUS.map(menu => (
                <button key={menu} className="px-2 py-0.5 hover:bg-gray-100 rounded-[4px] cursor-pointer">
                  {menu}
                </button>
              ))}
            </div>
          </div>
          
          {/* Share Button & Avatar */}
          <div className="flex items-center pl-4 space-x-4">
             <button title="Open comment history" className="p-2 hover:bg-gray-100 rounded-full text-icon-gray">
              <IconComment />
            </button>
            <button className="flex items-center h-10 px-6 bg-[#c2e7ff] hover:bg-[#b3d7ef] hover:shadow text-[#001d35] rounded-full transition-all font-medium text-[14px] gap-2">
              <IconShare />
              Share
            </button>
            <div className="w-8 h-8 bg-purple-600 rounded-full text-white flex items-center justify-center text-sm font-medium border-2 border-white ring-1 ring-gray-200">
              D
            </div>
          </div>
        </div>

        {/* --- TOOLBAR --- */}
        <div id="app-toolbar" className="flex items-center px-3 py-1.5 mx-3 mb-2 bg-toolbar-bg rounded-full gap-1 shadow-sm overflow-x-auto">
          <ToolbarButton onClick={() => format('undo')} tooltip="Undo (Ctrl+Z)"><IconUndo /></ToolbarButton>
          <ToolbarButton onClick={() => format('redo')} tooltip="Redo (Ctrl+Y)"><IconRedo /></ToolbarButton>
          <ToolbarButton onClick={() => window.print()} tooltip="Print (Ctrl+P)"><IconPrint /></ToolbarButton>
          <ToolbarButton tooltip="Paint format"><IconFormatPaint /></ToolbarButton>
          <div className="flex items-center px-1 text-sm font-medium text-gray-600">
            100% <span className="ml-1 text-[10px]">▼</span>
          </div>
          <Separator />
          <div className="flex items-center px-1 text-sm font-medium text-gray-600">
            Normal text <span className="ml-1 text-[10px]">▼</span>
          </div>
          <Separator />
          <div className="flex items-center px-1 text-sm font-medium text-gray-600 font-['Arial']">
            Arial <span className="ml-1 text-[10px]">▼</span>
          </div>
          <Separator />
          <div className="flex items-center px-1 text-sm font-medium text-gray-600">
            11 <span className="ml-1 text-[10px]">▼</span>
          </div>
          <Separator />
          <ToolbarButton onClick={() => format('bold')} tooltip="Bold (Ctrl+B)"><IconBold /></ToolbarButton>
          <ToolbarButton onClick={() => format('italic')} tooltip="Italic (Ctrl+I)"><IconItalic /></ToolbarButton>
          <ToolbarButton onClick={() => format('underline')} tooltip="Underline (Ctrl+U)"><IconUnderline /></ToolbarButton>
          <div className="px-1"><span className="text-gray-600 font-bold">A</span></div>
          <Separator />
          <ToolbarButton tooltip="Insert link (Ctrl+K)"><IconLink /></ToolbarButton>
          <ToolbarButton tooltip="Add comment"><IconComment /></ToolbarButton>
          <ToolbarButton tooltip="Insert Image"><IconImage /></ToolbarButton>
          <Separator />
          <ToolbarButton onClick={() => format('justifyLeft')} tooltip="Align left"><IconAlignLeft /></ToolbarButton>
          <ToolbarButton onClick={() => format('justifyCenter')} tooltip="Align center"><IconAlignCenter /></ToolbarButton>
          <ToolbarButton onClick={() => format('justifyRight')} tooltip="Align right"><IconAlignRight /></ToolbarButton>
          <Separator />
          <ToolbarButton onClick={() => format('insertUnorderedList')} tooltip="Bulleted list"><IconListBullet /></ToolbarButton>
          <ToolbarButton onClick={() => format('insertOrderedList')} tooltip="Numbered list"><IconListNumber /></ToolbarButton>
          <Separator />
          <button 
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 ml-2 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-google-blue rounded-full border border-blue-100 transition-all text-sm font-medium"
          >
            <IconSparkle />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Ask AI</span>
          </button>
        </div>
      </header>

      {/* --- EDITOR WORKSPACE --- */}
      <div id="editor-container" className="flex-1 overflow-y-auto bg-google-gray-bg relative flex justify-center p-8 pb-32">
        <div 
          id="doc-page"
          className="bg-white shadow-doc min-h-a4 w-full max-w-a4 p-[72px] outline-none print:shadow-none print:w-full print:max-w-none print:p-0"
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="editor-content w-full h-full outline-none font-['Arial'] text-[11pt] leading-relaxed whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
            onInput={handleInput}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
              }
            }}
            data-placeholder="Type @ to insert"
          />
        </div>

        {/* Word Count Status Bar */}
        <div className="fixed bottom-4 left-6 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs font-medium text-gray-600 shadow-lg flex items-center gap-4 z-40 hover:bg-gray-50 transition-colors print:hidden cursor-default">
           <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-google-blue"></span>
             <span>Page 1 of 1</span>
           </div>
           <div className="w-[1px] h-3 bg-gray-300"></div>
           <div>{stats.words} words</div>
           <div className="w-[1px] h-3 bg-gray-300"></div>
           <div>{stats.chars} characters</div>
        </div>
      </div>

      {/* --- AI MODAL --- */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-[500px] border border-gray-100 overflow-hidden flex flex-col animate-scale-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <div className="flex items-center gap-2">
                <IconSparkle />
                <h3 className="font-semibold text-gray-800">Help me write</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <input
                autoFocus
                type="text"
                placeholder="Ex: Summarize this document, Write a poem about..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm mb-4"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiRequest('custom')}
              />

              {/* Suggestions */}
              {!aiResponse && !aiLoading && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggestions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleAiRequest('summarize')} className="text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 border border-gray-100 transition-colors">📝 Summarize</button>
                    <button onClick={() => handleAiRequest('fix')} className="text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 border border-gray-100 transition-colors">✨ Fix Grammar</button>
                    <button onClick={() => handleAiRequest('tone')} className="text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 border border-gray-100 transition-colors">👔 Make Professional</button>
                    <button onClick={() => handleAiRequest('continue')} className="text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 border border-gray-100 transition-colors">✍️ Continue Writing</button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-gray-500 animate-pulse">Generating ideas...</p>
                </div>
              )}

              {/* Response Preview */}
              {aiResponse && (
                <div className="mt-2">
                   <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 max-h-60 overflow-y-auto mb-4 border border-gray-100 leading-relaxed">
                     {aiResponse}
                   </div>
                   <div className="flex gap-2 justify-end">
                     <button onClick={() => setAiResponse(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Discard</button>
                     <button onClick={insertAiContent} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors font-medium">Insert</button>
                   </div>
                </div>
              )}
            </div>
            
            {!aiResponse && !aiLoading && (
               <div className="px-6 py-3 bg-gray-50 text-xs text-gray-400 flex justify-between items-center border-t border-gray-100">
                  <span>Powered by Gemini</span>
                  <button onClick={() => handleAiRequest('custom')} disabled={!aiPrompt} className="text-blue-600 font-medium disabled:opacity-50 hover:underline">Generate →</button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}