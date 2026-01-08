import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Upload, FileText, CheckCircle, XCircle, Pause, Play, RefreshCw, Loader2, Image, Bot, User } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    step?: string;
    progress?: number;
    total?: number;
    thumbnails?: string[];
    questionCount?: number;
  };
  created_at: string;
}

interface ProcessingSession {
  id: string;
  pdf_name: string;
  category: string;
  status: string;
  processed_pages: number;
  total_pages: number;
  extracted_questions: number;
}

const CATEGORIES = [
  "DNA Structure, Replication and Repair",
  "DNA Structure, Synthesis and Processing",
  "Gene Expression and Regulation",
  "Clinical Genetics",
  "Miscellaneous"
];

export default function PDFChat() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSession, setCurrentSession] = useState<ProcessingSession | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessions, setSessions] = useState<ProcessingSession[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pauseRef = useRef(false);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadSessions();
      addSystemMessage("Welcome! I can process genetics PDFs and extract questions. Drop a PDF or type a command:\n\n• **Process [filename] as [category]**\n• **Show sessions**\n• **Resume [session-id]**\n\nAvailable categories:\n" + CATEGORIES.map(c => `• ${c}`).join('\n'));
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pdf_processing_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setSessions(data as ProcessingSession[]);
    }
  };

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'system',
      content,
      created_at: new Date().toISOString()
    }]);
  };

  const addAssistantMessage = (content: string, metadata?: ChatMessage['metadata']) => {
    const id = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id,
      role: 'assistant',
      content,
      metadata,
      created_at: new Date().toISOString()
    }]);
    return id;
  };

  const updateAssistantMessage = (id: string, content: string, metadata?: ChatMessage['metadata']) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, content, metadata: { ...msg.metadata, ...metadata } } : msg
    ));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      addAssistantMessage(`📄 Selected: **${file.name}**\n\nNow tell me which category to use. Type:\n\`Process ${file.name} as [category]\``);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      addAssistantMessage(`📄 Selected: **${file.name}**\n\nNow tell me which category to use.`);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    const userMessage = inputValue.trim();
    setInputValue("");
    
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }]);

    // Parse command
    const processMatch = userMessage.match(/process\s+(.+?)\s+as\s+(.+)/i);
    const resumeMatch = userMessage.match(/resume\s+(.+)/i);
    const showSessionsMatch = userMessage.match(/show\s+sessions?/i);
    const pauseMatch = userMessage.match(/pause/i);
    const cancelMatch = userMessage.match(/cancel|stop/i);

    if (processMatch) {
      const [, filename, category] = processMatch;
      await startProcessing(filename.trim(), category.trim());
    } else if (resumeMatch) {
      const sessionId = resumeMatch[1].trim();
      await resumeSession(sessionId);
    } else if (showSessionsMatch) {
      showSessions();
    } else if (pauseMatch && isProcessing) {
      pauseRef.current = true;
      setIsPaused(true);
      addAssistantMessage("⏸️ Processing paused. Type **resume** to continue or **cancel** to stop.");
    } else if (cancelMatch && isProcessing) {
      abortRef.current = true;
      setIsProcessing(false);
      addAssistantMessage("🛑 Processing cancelled.");
    } else {
      addAssistantMessage("I didn't understand that command. Try:\n• **Process [filename] as [category]**\n• **Show sessions**\n• **Resume [session-id]**\n• **Pause** or **Cancel** (during processing)");
    }
  };

  const showSessions = () => {
    if (sessions.length === 0) {
      addAssistantMessage("No processing sessions found. Upload a PDF to get started!");
      return;
    }

    const sessionList = sessions.map(s => 
      `• **${s.pdf_name}** (${s.category})\n  Status: ${s.status} | Pages: ${s.processed_pages}/${s.total_pages} | Questions: ${s.extracted_questions}\n  ID: \`${s.id.slice(0, 8)}\``
    ).join('\n\n');

    addAssistantMessage(`📋 **Your Sessions:**\n\n${sessionList}\n\nTo resume, type: \`Resume [session-id]\``);
  };

  const resumeSession = async (sessionIdPrefix: string) => {
    const session = sessions.find(s => s.id.startsWith(sessionIdPrefix));
    if (!session) {
      addAssistantMessage(`Session not found. Type **show sessions** to see available sessions.`);
      return;
    }

    if (session.status === 'completed') {
      addAssistantMessage(`✅ Session **${session.pdf_name}** is already completed with ${session.extracted_questions} questions extracted.`);
      return;
    }

    addAssistantMessage(`🔄 Resuming session for **${session.pdf_name}**...\nStarting from page ${session.processed_pages + 1}/${session.total_pages}`);
    setCurrentSession(session);
    // Resume logic would continue from where it left off
  };

  const startProcessing = async (filename: string, category: string) => {
    // Find matching category
    const matchedCategory = CATEGORIES.find(c => 
      c.toLowerCase().includes(category.toLowerCase()) || 
      category.toLowerCase().includes(c.toLowerCase().split(',')[0])
    );

    if (!matchedCategory) {
      addAssistantMessage(`❌ Unknown category: "${category}"\n\nAvailable categories:\n${CATEGORIES.map(c => `• ${c}`).join('\n')}`);
      return;
    }

    // Check if we have the file
    let pdfFile = selectedFile;
    
    if (!pdfFile || !pdfFile.name.toLowerCase().includes(filename.toLowerCase().replace('.pdf', ''))) {
      // Try to load from public folder
      try {
        const response = await fetch(`/pdfs/${filename}`);
        if (response.ok) {
          const blob = await response.blob();
          pdfFile = new File([blob], filename, { type: 'application/pdf' });
        } else {
          addAssistantMessage(`❌ PDF not found: "${filename}"\n\nPlease upload the PDF file first.`);
          return;
        }
      } catch {
        addAssistantMessage(`❌ Could not load PDF: "${filename}"`);
        return;
      }
    }

    setIsProcessing(true);
    pauseRef.current = false;
    abortRef.current = false;
    setIsPaused(false);

    const msgId = addAssistantMessage(`🚀 Starting processing of **${filename}**\nCategory: ${matchedCategory}\n\n⏳ Initializing...`);

    try {
      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('pdf_processing_sessions')
        .insert({
          pdf_name: filename,
          category: matchedCategory,
          subject: 'Biochemistry',
          system: 'Genetics',
          status: 'rendering',
          user_id: user!.id
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      setCurrentSession(session as ProcessingSession);

      // Load PDF
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      // Update session with total pages
      await supabase
        .from('pdf_processing_sessions')
        .update({ total_pages: totalPages })
        .eq('id', session.id);

      updateAssistantMessage(msgId, `🚀 Processing **${filename}**\nCategory: ${matchedCategory}\n\n📄 Total pages: ${totalPages}\n\n**Step 1/4: Rendering pages...**`, {
        step: 'rendering',
        progress: 0,
        total: totalPages
      });

      // Render pages in batches
      const RENDER_BATCH_SIZE = 5;
      const renderedPages: { pageNum: number; dataUrl: string }[] = [];

      for (let i = 0; i < totalPages; i += RENDER_BATCH_SIZE) {
        if (abortRef.current) throw new Error('Cancelled');
        while (pauseRef.current) {
          await new Promise(r => setTimeout(r, 500));
        }

        const batchEnd = Math.min(i + RENDER_BATCH_SIZE, totalPages);
        const batchPromises = [];

        for (let j = i; j < batchEnd; j++) {
          batchPromises.push(renderPage(pdf, j + 1));
        }

        const batchResults = await Promise.all(batchPromises);
        renderedPages.push(...batchResults);

        const progress = Math.round((renderedPages.length / totalPages) * 100);
        updateAssistantMessage(msgId, `🚀 Processing **${filename}**\n\n**Step 1/4: Rendering pages...**\n\n📄 Progress: ${renderedPages.length}/${totalPages} pages (${progress}%)`, {
          step: 'rendering',
          progress: renderedPages.length,
          total: totalPages,
          thumbnails: batchResults.slice(-3).map(p => p.dataUrl)
        });

        await supabase
          .from('pdf_processing_sessions')
          .update({ status: 'rendering', processed_pages: renderedPages.length })
          .eq('id', session.id);
      }

      // Step 2: Upload to storage
      updateAssistantMessage(msgId, `🚀 Processing **${filename}**\n\n✅ Rendering complete!\n\n**Step 2/4: Uploading to storage...**`, {
        step: 'uploading',
        progress: 0,
        total: totalPages
      });

      await supabase
        .from('pdf_processing_sessions')
        .update({ status: 'uploading' })
        .eq('id', session.id);

      const UPLOAD_BATCH_SIZE = 3;
      const uploadedUrls: { pageNum: number; url: string }[] = [];
      const basePath = `genetics/${session.id}`;

      for (let i = 0; i < renderedPages.length; i += UPLOAD_BATCH_SIZE) {
        if (abortRef.current) throw new Error('Cancelled');
        while (pauseRef.current) {
          await new Promise(r => setTimeout(r, 500));
        }

        const batch = renderedPages.slice(i, i + UPLOAD_BATCH_SIZE);
        const uploadPromises = batch.map(async (page) => {
          const blob = dataURLtoBlob(page.dataUrl);
          const filePath = `${basePath}/page-${page.pageNum.toString().padStart(3, '0')}.png`;
          
          const { error } = await supabase.storage
            .from('question-images')
            .upload(filePath, blob, { upsert: true });

          if (error) throw error;

          const { data: urlData } = supabase.storage
            .from('question-images')
            .getPublicUrl(filePath);

          return { pageNum: page.pageNum, url: urlData.publicUrl };
        });

        const batchResults = await Promise.all(uploadPromises);
        uploadedUrls.push(...batchResults);

        const progress = Math.round((uploadedUrls.length / totalPages) * 100);
        updateAssistantMessage(msgId, `🚀 Processing **${filename}**\n\n✅ Rendering complete!\n\n**Step 2/4: Uploading to storage...**\n\n☁️ Progress: ${uploadedUrls.length}/${totalPages} (${progress}%)`, {
          step: 'uploading',
          progress: uploadedUrls.length,
          total: totalPages
        });
      }

      // Step 3: AI Analysis
      updateAssistantMessage(msgId, `🚀 Processing **${filename}**\n\n✅ Rendering complete!\n✅ Upload complete!\n\n**Step 3/4: AI analyzing pages...**`, {
        step: 'analyzing',
        progress: 0,
        total: totalPages
      });

      await supabase
        .from('pdf_processing_sessions')
        .update({ status: 'analyzing' })
        .eq('id', session.id);

      // Call the edge function
      const { data: extractionResult, error: extractError } = await supabase.functions.invoke('pdf-chat-processor', {
        body: {
          sessionId: session.id,
          pageImages: uploadedUrls.map(p => ({ pageNum: p.pageNum, url: p.url })),
          pdfName: filename,
          category: matchedCategory,
          subject: 'Biochemistry',
          system: 'Genetics'
        }
      });

      if (extractError) throw extractError;

      // Step 4: Complete
      const questionCount = extractionResult?.questionsExtracted || 0;
      
      await supabase
        .from('pdf_processing_sessions')
        .update({ 
          status: 'completed',
          processed_pages: totalPages,
          extracted_questions: questionCount
        })
        .eq('id', session.id);

      updateAssistantMessage(msgId, `🎉 **Processing Complete!**\n\n📄 PDF: ${filename}\n📂 Category: ${matchedCategory}\n📊 Pages processed: ${totalPages}\n✨ Questions extracted: ${questionCount}\n\n${extractionResult?.summary || 'Questions have been saved to the database.'}`, {
        step: 'completed',
        progress: totalPages,
        total: totalPages,
        questionCount
      });

      await loadSessions();

    } catch (error: any) {
      console.error('Processing error:', error);
      
      if (currentSession) {
        await supabase
          .from('pdf_processing_sessions')
          .update({ 
            status: error.message === 'Cancelled' ? 'paused' : 'failed',
            error_message: error.message
          })
          .eq('id', currentSession.id);
      }

      if (error.message !== 'Cancelled') {
        updateAssistantMessage(msgId, `❌ **Processing Failed**\n\nError: ${error.message}\n\nYou can try again or resume later.`);
        toast.error("Processing failed: " + error.message);
      }
    } finally {
      setIsProcessing(false);
      setCurrentSession(null);
    }
  };

  const renderPage = async (pdf: any, pageNum: number): Promise<{ pageNum: number; dataUrl: string }> => {
    const page = await pdf.getPage(pageNum);
    const scale = 2; // 144 DPI (72 * 2)
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d')!;
    await page.render({ canvasContext: context, viewport }).promise;
    
    const dataUrl = canvas.toDataURL('image/png', 0.9);
    canvas.remove();
    
    return { pageNum, dataUrl };
  };

  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">PDF Question Extractor</h1>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processing...
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload PDF
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : msg.role === 'system'
                    ? 'bg-muted border'
                    : 'bg-card border'
                }`}
              >
                <div className="flex items-start gap-2">
                  {msg.role !== 'user' && (
                    <Bot className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                  )}
                  <div className="space-y-2">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {msg.content.split('\n').map((line, i) => (
                        <p key={i} className="mb-1 last:mb-0">
                          {line.split('**').map((part, j) => 
                            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                          )}
                        </p>
                      ))}
                    </div>
                    
                    {msg.metadata?.step && msg.metadata.step !== 'completed' && (
                      <div className="mt-2">
                        <Progress 
                          value={(msg.metadata.progress! / msg.metadata.total!) * 100} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {msg.metadata.progress}/{msg.metadata.total}
                        </p>
                      </div>
                    )}

                    {msg.metadata?.thumbnails && msg.metadata.thumbnails.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {msg.metadata.thumbnails.map((thumb, i) => (
                          <img
                            key={i}
                            src={thumb}
                            alt={`Page preview ${i + 1}`}
                            className="h-16 w-auto rounded border"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Drop zone overlay */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="hidden"
      />

      {/* Input */}
      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isProcessing ? "Type 'pause' or 'cancel'..." : "Type a command..."}
            disabled={false}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick commands */}
        {!isProcessing && (
          <div className="max-w-3xl mx-auto mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setInputValue("Show sessions")}>
              📋 Show Sessions
            </Button>
            {selectedFile && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setInputValue(`Process ${selectedFile.name} as Clinical Genetics`)}
              >
                🚀 Process {selectedFile.name.slice(0, 20)}...
              </Button>
            )}
          </div>
        )}
        
        {isProcessing && (
          <div className="max-w-3xl mx-auto mt-2 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                pauseRef.current = !pauseRef.current;
                setIsPaused(!isPaused);
              }}
            >
              {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => {
                abortRef.current = true;
              }}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
