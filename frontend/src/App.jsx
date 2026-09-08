import React, { useState, useRef, useEffect } from 'react'; 
import { Home, MessageSquare, Settings, User, Plus, Send, UploadCloud, X, FileText, Lock, Mail, LogOut, ShieldCheck, Users, MessageCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  // --- STATE (DURUM) YÖNETİMİ ---
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [loginError, setLoginError] = useState(''); 
  const [isLoading, setIsLoading] = useState(false); 

  // EKRAN GÖRÜNÜMÜ KONTROLÜ (Chat mi? Admin mi?)
  const [activeView, setActiveView] = useState('chat'); 
  const [message, setMessage] = useState(''); 
  
  // Sisteme giriş yapan kullanıcının rolü
  const [userRole, setUserRole] = useState(null); 

  // ==========================================
  // 💬 CHAT (SOHBET) SİSTEMİ STATE'LERİ
  // ==========================================
  const [chatSessions, setChatSessions] = useState([]); 
  const [activeSessionId, setActiveSessionId] = useState(null); 
  const [chatHistory, setChatHistory] = useState([]); 
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ==========================================
  // 🎯 AI KAYNAK REFERANSI STATE'LERİ
  // ==========================================
  const [referenceData, setReferenceData] = useState(null); 
  const [referencePdfUrl, setReferencePdfUrl] = useState(null);

  useEffect(() => {
    if (activeView === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatLoading, activeView]);

  // ==========================================
  // 📁 DOKÜMAN YÜKLEME VE LİSTELEME STATE'LERİ
  // ==========================================
  const [selectedFile, setSelectedFile] = useState(null); // Artık dizi (array) tutacak
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  
  const [documents, setDocuments] = useState([]); 
  const [previewDoc, setPreviewDoc] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null); 
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ==========================================
  // 🛡️ ADMIN PANELİ STATE'LERİ 
  // ==========================================
  const [usersList, setUsersList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState({ type: '', text: '' });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee', department_id: '' });

  // Çıkış Yapma İşlemi
  const handleLogout = () => {
    localStorage.removeItem('access_token'); 
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setUserRole(null); 
    setChatSessions([]);
    setActiveSessionId(null);
    setChatHistory([]);
    setReferenceData(null); 
    setReferencePdfUrl(null);
    toast.success('Başarıyla çıkış yapıldı.');
  };

  // Güvenli API İstek Fonksiyonu
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      toast.error("Oturum süreniz doldu veya yetkisiz işlem. Lütfen tekrar giriş yapın.");
      handleLogout();
      throw new Error("Unauthorized");
    }
    return response;
  };

  // ==========================================
  // 🔄 1. GEÇMİŞ SOHBETLERİ GETİRME (SOL MENÜ)
  // ==========================================
  const fetchChatSessions = async () => {
    try {
      const response = await fetchWithAuth('http://localhost:8000/api/v1/chat/sessions');
      if (response.ok) {
        const data = await response.json();
        setChatSessions(data);
        
        if (data.length > 0 && !activeSessionId) {
          handleSelectSession(data[0].id);
        } else if (data.length === 0) {
          setChatHistory([{ role: 'ai', content: 'Merhaba! Sol üstten "New Chat" butonuna basarak yeni bir sohbet başlatabilirsiniz.' }]);
        }
      }
    } catch (error) {
      console.error('Sohbetler çekilemedi:', error);
    }
  };

  // ==========================================
  // ➕ 2. YENİ SOHBET (NEW CHAT) OLUŞTURMA
  // ==========================================
  const handleNewChat = async () => {
    try {
      const response = await fetchWithAuth('http://localhost:8000/api/v1/chat/sessions', { method: 'POST' });
      if (response.ok) {
        const newSession = await response.json();
        setChatSessions(prev => [newSession, ...prev]); 
        setActiveSessionId(newSession.id); 
        setChatHistory([{ role: 'ai', content: 'Merhaba! Size nasıl yardımcı olabilirim?' }]); 
        setReferenceData(null); 
        setReferencePdfUrl(null);
        toast.success("Yeni sohbet başlatıldı.");
      }
    } catch (error) {
      toast.error('Yeni sohbet oluşturulamadı.');
    }
  };

  // ==========================================
  // 📂 3. ESKİ BİR SOHBETE TIKLAMA
  // ==========================================
  const handleSelectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    setChatHistory([]); 
    setIsChatLoading(true);
    setReferenceData(null); 
    setReferencePdfUrl(null);

    try {
      const response = await fetchWithAuth(`http://localhost:8000/api/v1/chat/sessions/${sessionId}/messages`);
      if (response.ok) {
        const messages = await response.json();
        if (messages.length === 0) {
          setChatHistory([{ role: 'ai', content: 'Merhaba! Size nasıl yardımcı olabilirim?' }]);
        } else {
          const formattedMessages = messages.map(m => ({
            role: m.role === 'assistant' ? 'ai' : m.role,
            content: m.content
          }));
          setChatHistory(formattedMessages);
        }
      }
    } catch (error) {
      console.error('Mesajlar çekilemedi:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ==========================================
  // 🗑️ 3.5 SOHBET SİLME FONKSİYONU (MODERN ONAYLI)
  // ==========================================
  const confirmDeleteSession = (sessionId, e) => {
    e.stopPropagation(); 
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-bold text-slate-800">Bu sohbeti silmek istediğinize emin misiniz?</span>
        <div className="flex gap-2 justify-end">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
          >
            İptal
          </button>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              executeDeleteSession(sessionId);
            }} 
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition shadow-sm"
          >
            Evet, Sil
          </button>
        </div>
      </div>
    ), { duration: 6000, id: `delete-session-${sessionId}` });
  };

  const executeDeleteSession = async (sessionId) => {
    try {
      const response = await fetchWithAuth(`http://localhost:8000/api/v1/chat/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setChatSessions(prev => prev.filter(s => s.id !== sessionId)); 
        toast.success("Sohbet başarıyla silindi.");
        
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setChatHistory([{ role: 'ai', content: 'Merhaba! Sol üstten "New Chat" butonuna basarak yeni bir sohbet başlatabilirsiniz.' }]);
          setReferenceData(null);
          setReferencePdfUrl(null);
        }
      } else {
        toast.error('Sohbet silinemedi.');
      }
    } catch (error) {
      toast.error('Sunucuya ulaşılamadı. Silme işlemi başarısız.');
    }
  };

  // ==========================================
  // ADMIN & DOKÜMAN & KULLANICI VERİLERİNİ ÇEKME
  // ==========================================
  const fetchAdminData = async () => {
    try {
      const [usersRes, depsRes] = await Promise.all([fetchWithAuth('http://localhost:8000/users/'), fetchWithAuth('http://localhost:8000/departments/')]);
      if (usersRes.ok) setUsersList(await usersRes.json());
      if (depsRes.ok) setDepartments(await depsRes.json());
    } catch (error) {}
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetchWithAuth('http://localhost:8000/documents/');
      if (response.ok) setDocuments(await response.json());
    } catch (error) {}
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetchWithAuth('http://localhost:8000/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role); 
      }
    } catch (error) {}
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentUser(); 
      fetchDocuments();
      fetchChatSessions(); 
      toast.success('Sisteme başarıyla giriş yapıldı!', { icon: '👋' });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeView === 'admin') fetchAdminData();
  }, [isAuthenticated, activeView]);

  // ==========================================
  // ⏳ AKILLI DOKÜMAN YENİLEME (POLLING)
  // ==========================================
  useEffect(() => {
    let interval;
    if (isAuthenticated && documents.some(doc => doc.status === 'PENDING')) {
      interval = setInterval(() => {
        fetchDocuments();
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [documents, isAuthenticated]);

  const handleRegisterUser = async (e) => {
    e.preventDefault(); setIsRegistering(true); setRegisterMsg({ type: '', text: '' });
    try {
      const response = await fetchWithAuth('http://localhost:8000/users/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newUser, department_id: newUser.department_id ? parseInt(newUser.department_id) : null }) });
      if (response.ok) { 
        toast.success('Kullanıcı başarıyla eklendi! ✅'); 
        setNewUser({ name: '', email: '', password: '', role: 'employee', department_id: '' }); 
        fetchAdminData(); 
      } else { 
        const errorData = await response.json().catch(() => ({})); 
        toast.error(`Kayıt Hatası: ${errorData.detail || 'Bilinmiyor'} ❌`); 
      }
    } catch (error) { 
      toast.error('Sunucuya ulaşılamadı. ❌'); 
    } finally { 
      setIsRegistering(false); 
    }
  };

  // ==========================================
  // 🗑️ DOKÜMAN SİLME FONKSİYONU (MODERN ONAYLI)
  // ==========================================
  const confirmDeleteDocument = (doc, e) => {
    e.stopPropagation(); 
    const docName = doc.filename || doc.name || doc.title || "Bu doküman";
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-bold text-slate-800">"{docName}" silinecek. Emin misiniz?</span>
        <div className="flex gap-2 justify-end">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
          >
            İptal
          </button>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              executeDeleteDocument(doc);
            }} 
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition shadow-sm"
          >
            Evet, Sil
          </button>
        </div>
      </div>
    ), { duration: 6000, id: `delete-doc-${doc.id || doc._id || doc.document_id}` });
  };

  const executeDeleteDocument = async (doc) => {
    try {
      const response = await fetchWithAuth(`http://localhost:8000/documents/${doc.id || doc._id || doc.document_id}`, { method: 'DELETE' });
      if (response.ok) { 
        fetchDocuments(); 
        toast.success('Doküman başarıyla silindi.');
        if (previewDoc && (previewDoc.id === (doc.id || doc._id))) { setIsModalOpen(false); setPreviewDoc(null); } 
      } else { 
        toast.error('Silme başarısız oldu.'); 
      }
    } catch (error) { 
      toast.error('Sunucuya ulaşılamadı. Silme işlemi başarısız.'); 
    }
  };

  const handlePreviewDocument = async (doc) => {
    setPreviewDoc(doc); setPdfUrl(null); setIsPdfLoading(true); setIsModalOpen(true); 
    try {
      const response = await fetchWithAuth(`http://localhost:8000/documents/${doc.id || doc._id || doc.filename}/download`);
      if (response.ok) { const blob = await response.blob(); setPdfUrl(URL.createObjectURL(blob)); }
    } catch (error) {
      toast.error('Doküman yüklenirken hata oluştu.');
    } finally { 
      setIsPdfLoading(false); 
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setIsLoading(true); setLoginError('');
    try {
      const formData = new URLSearchParams(); formData.append('username', email); formData.append('password', password);
      const response = await fetch('http://localhost:8000/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
      if (response.ok) { 
        const data = await response.json(); 
        localStorage.setItem('access_token', data.access_token); 
        setIsAuthenticated(true); 
      } else { 
        setLoginError('E-posta veya şifre hatalı!'); 
        toast.error('E-posta veya şifre hatalı!');
      }
    } catch (error) { 
      setLoginError('Sunucuya ulaşılamadı. FastAPI backend açık mı?'); 
      toast.error('Sunucuya ulaşılamadı. Sunucu açık mı?');
    } finally { 
      setIsLoading(false); 
    }
  };

  const testSecuredEndpoint = async () => {
    try {
      const res = await fetchWithAuth('http://localhost:8000/api/v1/documents/db-check');
      const data = await res.json();
      toast.success(`BAŞARILI! Kapı açıldı.\nİstek Yapan: ${data.istegi_yapan}\nVeritabanı Durumu: ${data.veritabani_durumu}`, { duration: 4000 });
    } catch (error) {
      toast.error("Test başarısız oldu, bağlantı kurulamadı.");
    }
  };

  // ==========================================
  // 🚀 4. MESAJ GÖNDERME (STREAMING + AI REFERANS YAKALAYICI)
  // ==========================================
  const handleSendMessage = async () => {
    if (!message.trim() || !activeSessionId) return; 
    
    const userText = message;
    setChatHistory(prev => [...prev, { role: 'user', content: userText }]);
    setMessage('');
    setIsChatLoading(true); 

    try {
      const response = await fetchWithAuth('http://localhost:8000/api/v1/chat/', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ session_id: activeSessionId, question: userText }) 
      });

      setIsChatLoading(false);

      if (!response.ok) {
        setChatHistory(prev => [...prev, { role: 'ai', content: `❌ Sunucu Hatası: ${response.status}` }]);
        toast.error('Mesaj gönderilirken sunucu hatası oluştu.');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let aiFullResponse = "";

      setChatHistory(prev => [...prev, { role: 'ai', content: '' }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          aiFullResponse += chunk;
          
          let displayContent = aiFullResponse;
          const refMatch = aiFullResponse.match(/\[\[REF:(.*?)\]\]/);
          
          if (refMatch) {
            try {
              const refParsed = JSON.parse(refMatch[1]);
              
              const cleanText = userText.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, ' '); 
              const words = cleanText.split(/\s+/).filter(w => w.length > 5); 
              const searchKeyword = words.length > 0 ? words.sort((a, b) => b.length - a.length)[0] : cleanText.split(' ')[0];

              setReferenceData({ page: refParsed.page, keyword: searchKeyword });
              
              let matchedDoc = documents.find(d => {
                const docName = (d.filename || d.name || d.title || "").toLowerCase();
                const sourceName = (refParsed.source || "").toLowerCase();
                const cleanDoc = docName.replace(/\.[^/.]+$/, "");
                const cleanSource = sourceName.replace(/\.[^/.]+$/, "");
                return sourceName.includes(cleanDoc) || docName.includes(cleanSource) || cleanDoc === cleanSource;
              });
              
              if (!matchedDoc && documents.length > 0) {
                matchedDoc = documents.find(d => (d.filename || d.name || "").toLowerCase().endsWith(".pdf")) || documents[0];
              }
              
              if (matchedDoc) {
                const docId = matchedDoc.id || matchedDoc._id || matchedDoc.document_id;
                fetchWithAuth(`http://localhost:8000/documents/${docId}/download`)
                  .then(res => res.blob())
                  .then(blob => {
                    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                    setReferencePdfUrl(URL.createObjectURL(pdfBlob));
                  })
                  .catch(err => console.error("Referans PDF çekilemedi:", err));
              }
            } catch (e) {
              console.error("Referans ayrıştırma hatası:", e);
            }
            
            displayContent = aiFullResponse.replace(/\[\[REF:.*?\]\]/, '');
          }

          setChatHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1].content = displayContent;
            return newHistory;
          });
        }
      }

      fetchChatSessions(); 

    } catch (error) {
      setIsChatLoading(false);
      setChatHistory(prev => [...prev, { role: 'ai', content: `❌ İşlem Hatası: ${error.message}` }]);
      toast.error('Mesaj işlenirken bir hata oluştu.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isChatLoading) handleSendMessage();
  };

  // 🌟 YENİ: ÇOKLU DOSYA SEÇİMİ (ARRAY OLARAK ALMA)
  const handleFileChange = (event) => { 
    if (event.target.files && event.target.files.length > 0) { 
      setSelectedFile(Array.from(event.target.files)); 
      setUploadMessage(`${event.target.files.length} dosya seçildi.`); 
    } else {
      setSelectedFile(null);
      setUploadMessage('');
    }
  };

  // 🌟 YENİ: ÇOKLU DOSYA YÜKLEME (FORMDATA APPEND DÖNGÜSÜ)
  const handleFileUpload = async () => {
    if (!selectedFile || selectedFile.length === 0) return;
    setIsUploading(true); setUploadMessage('');
    const formData = new FormData(); 
    
    selectedFile.forEach(file => {
      formData.append('files', file); // Backend'deki "files" ismine uygun eklendi
    });
    
    try {
      const response = await fetchWithAuth('http://localhost:8000/documents/upload', { method: 'POST', body: formData });
      if (response.ok) { 
        setUploadMessage('Dosyalar başarıyla yüklendi! ✅'); 
        toast.success('Dosyalar başarıyla yüklendi!');
        setSelectedFile(null); 
        document.getElementById('file-upload-input').value = ''; 
        fetchDocuments(); 
      } else { 
        setUploadMessage(`Hata: Yüklenemedi. ❌`); 
        toast.error('Dosyalar yüklenirken bir hata oluştu.');
      }
    } catch (error) { 
      setUploadMessage('Sunucuya ulaşılamadı. ❌'); 
      toast.error('Sunucuya ulaşılamadı.');
    } finally { 
      setIsUploading(false); 
    }
  };

  // ==========================================
  // EKRAN 1: GİRİŞ YAPILMADIYSA LOGIN GÖSTER
  // ==========================================
  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans text-slate-800">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-brand-dark p-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/40 mb-5 border border-slate-700 relative overflow-hidden group">
                <span className="font-black text-3xl tracking-tighter">KH</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Knowledge Hub</h2>
              <p className="text-slate-400 text-sm font-medium">Kurumsal Yapay Zeka</p>
            </div>
            <div className="p-8">
              <form onSubmit={handleLogin} className="space-y-5">
                {loginError && <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-semibold border border-red-100 text-center">{loginError}</div>}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Kurumsal E-posta</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-slate-400" /></div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue bg-slate-50 focus:bg-white text-slate-700 font-medium" placeholder="ornek@sirket.com" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Şifre</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-400" /></div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue bg-slate-50 focus:bg-white text-slate-700 font-medium" placeholder="••••••••" required />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition shadow-md flex justify-center items-center mt-2 ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-brand-blue hover:bg-blue-700 shadow-blue-500/20'}`}>
                  {isLoading ? 'Giriş Yapılıyor...' : 'Sisteme Giriş Yap'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ==========================================
  // EKRAN 2: GİRİŞ BAŞARILIYSA ANA UYGULAMAYI GÖSTER
  // ==========================================
  return (
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen bg-white font-sans text-slate-800 overflow-hidden relative">
        
        {/* 1. SOL BÖLÜM: Navigasyon ve Geçmiş */}
        <div className="flex h-full border-r border-slate-200">
          <div className="w-16 bg-brand-dark flex flex-col items-center py-6 gap-8 text-slate-400 shrink-0">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 cursor-pointer hover:scale-105 transition-transform border border-slate-700 mb-4">
              <span className="font-black text-xl tracking-tighter">KH</span>
            </div>
            <Home className="w-6 h-6 hover:text-white cursor-pointer transition-colors" />
            
            <MessageSquare 
              onClick={() => setActiveView('chat')} 
              className={`w-6 h-6 cursor-pointer transition-colors ${activeView === 'chat' ? 'text-white' : 'hover:text-white'}`} 
              title="Chat Ekranı"
            />
            
            <Settings onClick={testSecuredEndpoint} className="w-6 h-6 hover:text-white cursor-pointer transition-colors text-yellow-500 hover:text-yellow-400" />
            
            <div className="mt-auto pb-4 flex flex-col gap-6 items-center">
              {/* 🛡️ SADECE ADMIN GÖREBİLİR */}
              {userRole === 'admin' && (
                <User 
                  onClick={() => setActiveView('admin')} 
                  className={`w-6 h-6 cursor-pointer transition-colors ${activeView === 'admin' ? 'text-brand-blue bg-white rounded-full p-0.5' : 'hover:text-white'}`} 
                  title="Admin Paneli"
                />
              )}
              <LogOut onClick={handleLogout} className="w-5 h-5 text-slate-500 hover:text-red-400 cursor-pointer transition-colors" title="Çıkış Yap" />
            </div>
          </div>
          
          <div className="w-64 bg-slate-50 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 font-bold text-lg text-slate-800">Knowledge Hub</div>
            <div className="p-4">
              <button onClick={handleNewChat} className="w-full bg-brand-blue text-white rounded-lg py-2 flex items-center justify-center gap-2 font-medium hover:bg-blue-700 transition shadow-sm">
                <Plus className="w-5 h-5" /> New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="text-xs font-bold text-slate-500 mb-2 px-2 uppercase tracking-wider">Recent Chats</div>
              
              {/* 🔄 DİNAMİK SOHBET LİSTESİ */}
              {chatSessions.length === 0 ? (
                <div className="text-xs text-slate-400 text-center mt-4">Henüz sohbet yok.</div>
              ) : (
                chatSessions.map((session) => (
                  <div 
                    key={session.id} 
                    onClick={() => handleSelectSession(session.id)}
                    className={`p-2.5 rounded-lg text-sm cursor-pointer font-medium mb-1 transition flex items-center justify-between group
                      ${activeSessionId === session.id 
                        ? 'bg-brand-blue/10 text-brand-blue font-bold border border-brand-blue/20' 
                        : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <MessageCircle className="w-4 h-4 shrink-0 opacity-70" />
                      <span className="truncate" title={session.title}>{session.title}</span>
                    </div>
                    {/* 🗑️ MODERN SİLME BUTONU BAĞLANTISI */}
                    <button 
                      onClick={(e) => confirmDeleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition shrink-0"
                      title="Sil"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
              
            </div>
          </div>
        </div>

        {/* 2. ORTA BÖLÜM: DİNAMİK EKRAN (CHAT VEYA ADMIN) */}
        <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
          
          {activeView === 'chat' ? (
            
            // ==============================
            // CHAT ARAYÜZÜ 
            // ==============================
            <>
              <div className="h-16 border-b border-slate-200 flex items-center px-6 font-bold text-lg text-slate-800 shrink-0">
                 {/* Üst başlığa aktif sohbetin adını yaz */}
                 {activeSessionId ? (chatSessions.find(s => s.id === activeSessionId)?.title || "Chat") : "Chat"}
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                {chatHistory.map((msg, index) => (
                  msg.role === 'user' ? (
                    <div key={index} className="flex justify-end">
                      <div className="bg-slate-800 text-white p-4 rounded-2xl rounded-tr-sm max-w-2xl shadow-sm border border-slate-700">{msg.content}</div>
                    </div>
                  ) : (
                    <div key={index} className="flex justify-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white shrink-0 mt-1 shadow-sm"><MessageSquare className="w-4 h-4" /></div>
                      <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-sm max-w-2xl text-slate-800 shadow-sm border border-slate-200 whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  )
                ))}

                {/* 🛠️ GERİ GETİRİLEN 3 NOKTALI BEKLEME ANİMASYONU */}
                {isChatLoading && (
                  <div className="flex justify-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-50 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200 flex items-center gap-1.5 h-[52px]">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                <div className="max-w-4xl mx-auto flex items-center border border-slate-300 rounded-xl p-2 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue transition bg-white shadow-sm">
                  <input 
                    type="text" 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    onKeyDown={handleKeyDown} 
                    placeholder={activeSessionId ? "Ask anything..." : "Lütfen yeni bir sohbet başlatın..."} 
                    className="flex-1 outline-none px-3 bg-transparent text-slate-700 placeholder-slate-400 font-medium" 
                    disabled={isChatLoading || !activeSessionId} 
                  />
                  <button 
                    onClick={handleSendMessage} 
                    disabled={!message.trim() || isChatLoading || !activeSessionId} 
                    className="bg-brand-blue hover:bg-blue-700 disabled:bg-slate-300 text-white p-2.5 rounded-lg transition shadow-sm"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>

          ) : (
            
            // ==============================
            // 🛡️ ADMIN PANELİ ARAYÜZÜ 
            // ==============================
            <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
              <div className="h-16 border-b border-slate-200 bg-white flex items-center px-6 font-bold text-lg text-slate-800 shrink-0 gap-2 shadow-sm">
                <ShieldCheck className="w-6 h-6 text-brand-blue" />
                Sistem Yönetimi (Admin Paneli)
              </div>

              <div className="p-6 max-w-7xl mx-auto w-full grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* SOL KISIM: KULLANICI LİSTESİ TABLOSU */}
                <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-500" />
                    <h3 className="font-bold text-slate-700">Mevcut Kullanıcılar</h3>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-4">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-200 text-sm text-slate-500">
                          <th className="pb-3 font-semibold px-2">ID</th>
                          <th className="pb-3 font-semibold px-2">Ad Soyad</th>
                          <th className="pb-3 font-semibold px-2">E-posta</th>
                          <th className="pb-3 font-semibold px-2">Yetki (Rol)</th>
                          <th className="pb-3 font-semibold px-2">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {usersList.length === 0 ? (
                          <tr><td colSpan="5" className="text-center py-8 text-slate-400">Henüz kullanıcı bulunmuyor.</td></tr>
                        ) : (
                          usersList.map((usr) => (
                            <tr key={usr.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                              <td className="py-3 px-2 font-medium text-slate-500">#{usr.id}</td>
                              <td className="py-3 px-2 font-bold text-slate-800">{usr.name}</td>
                              <td className="py-3 px-2 text-slate-600">{usr.email}</td>
                              <td className="py-3 px-2">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide
                                  ${usr.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                                    usr.role === 'manager' ? 'bg-blue-100 text-blue-700' : 
                                    'bg-slate-100 text-slate-600'}`
                                }>
                                  {usr.role}
                                </span>
                              </td>
                              <td className="py-3 px-2">
                                {usr.is_active ? 
                                  <span className="flex items-center gap-1 text-emerald-600 font-semibold"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Aktif</span> : 
                                  <span className="flex items-center gap-1 text-red-500 font-semibold"><div className="w-2 h-2 rounded-full bg-red-500"></div>Pasif</span>
                                }
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SAĞ KISIM: YENİ KULLANICI EKLEME FORMU */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-fit">
                  <h3 className="font-bold text-slate-700 text-lg mb-5 border-b border-slate-100 pb-3">Yeni Personel Kaydı</h3>
                  
                  <form onSubmit={handleRegisterUser} className="space-y-4">
                    
                    {registerMsg.text && (
                      <div className={`p-3 rounded-lg text-sm font-semibold text-center border ${registerMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {registerMsg.text}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ad Soyad</label>
                      <input type="text" required value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-blue bg-slate-50 text-sm font-medium" placeholder="Örn: Barış Çelik" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-posta</label>
                      <input type="email" required value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-blue bg-slate-50 text-sm font-medium" placeholder="isim@sirket.com" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Şifre</label>
                      <input type="password" required value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-blue bg-slate-50 text-sm font-medium" placeholder="••••••••" />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sistem Yetkisi (Role)</label>
                      <select required value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-blue bg-slate-50 text-sm font-bold text-slate-700 cursor-pointer">
                        <option value="employee">Çalışan (Employee)</option>
                        <option value="manager">Yönetici (Manager)</option>
                        <option value="admin">Sistem Yöneticisi (Admin)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Departman</label>
                      <select value={newUser.department_id} onChange={(e) => setNewUser({...newUser, department_id: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-blue bg-slate-50 text-sm font-bold text-slate-700 cursor-pointer">
                        <option value="">(Departman Seçin)</option>
                        {departments.map(dep => (
                          <option key={dep.id} value={dep.id}>{dep.name}</option>
                        ))}
                      </select>
                    </div>

                    <button type="submit" disabled={isRegistering} className={`w-full text-white font-bold py-3 mt-4 rounded-xl transition shadow-md flex justify-center items-center ${isRegistering ? 'bg-brand-blue/60 cursor-not-allowed' : 'bg-brand-blue hover:bg-blue-700'}`}>
                      {isRegistering ? 'Kaydediliyor...' : 'Kullanıcıyı Oluştur'}
                    </button>
                  </form>

                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* 3. SAĞ BÖLÜM: Dokümanlar (Yalnızca CHAT EKRANINDA GÖSTERİLECEK) */}
        {/* ========================================== */}
        {activeView === 'chat' && (
          <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 relative z-10">
            
            {/* Panel Başlığı (Sabit) */}
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-5 font-bold text-lg text-slate-800 shrink-0">
              Documents & Sources
              <X className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-700 transition" />
            </div>
            
            <div className="p-5 flex flex-col gap-5 overflow-hidden flex-1">
              
              {/* ÜST: Dosya Yükleme Kutusu (Sabit) */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-center transition bg-slate-50 hover:bg-white hover:border-brand-blue shrink-0">
                <UploadCloud className={`w-8 h-8 mb-3 transition ${selectedFile && selectedFile.length > 0 ? 'text-brand-blue' : 'text-slate-400'}`} />
                
                {/* 🌟 YENİ: multiple özelliği ile toplu dosya seçimi */}
                <input
                  id="file-upload-input"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="mb-4 block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />

                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={!selectedFile || selectedFile.length === 0 || isUploading}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm flex justify-center items-center ${
                    !selectedFile || selectedFile.length === 0 || isUploading
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-brand-blue text-white hover:bg-blue-700 hover:shadow-md"
                  }`}
                >
                  {isUploading ? "Yükleniyor..." : selectedFile && selectedFile.length > 1 ? "Dosyaları Yükle" : "Dosyayı Yükle"}
                </button>

                {uploadMessage && (
                  <p className={`mt-3 text-xs font-semibold ${uploadMessage.includes("Hata") || uploadMessage.includes("Lütfen") || uploadMessage.includes("ulaşılamadı") ? "text-red-500" : "text-emerald-600"}`}>
                    {uploadMessage}
                  </p>
                )}
              </div>
              
              {/* 🎯 ORTA: DİNAMİK DOKÜMAN LİSTESİ */}
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider shrink-0">Mevcut Dosyalar</div>
                
                <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 pb-1">
                  {documents.length === 0 ? (
                    <div className="text-sm text-slate-400 italic px-2">Henüz dosya bulunmuyor.</div>
                  ) : (
                    documents.map((doc, index) => {
                      
                      const docName = doc.filename || doc.name || doc.file_name || doc.title || `İsimsiz Dosya ${index + 1}`;
                      const status = doc.status || 'PROCESSED'; 
                      
                      return (
                        <div 
                          key={index} 
                          onClick={() => handlePreviewDocument(doc)} 
                          className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm hover:bg-white transition cursor-pointer group shrink-0"
                        >
                          <div className="flex items-center gap-3 flex-1 overflow-hidden">
                            <div className="bg-red-100 p-2 rounded text-red-600 shrink-0 group-hover:scale-110 transition-transform">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <div className="text-sm font-semibold truncate text-slate-700" title={docName}>
                                {docName}
                              </div>
                              
                              {/* 🌟 İŞLENİYOR / HAZIR ROZETİ */}
                              <div className="mt-0.5">
                                {status === 'PENDING' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">
                                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div> İşleniyor
                                  </span>
                                ) : status === 'FAILED' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Hata
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Hazır
                                  </span>
                                )}
                              </div>

                            </div>
                          </div>

                          {/* 🗑️ MODERN BELGE SİLME BUTONU BAĞLANTISI */}
                          <button 
                            onClick={(e) => confirmDeleteDocument(doc, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition shrink-0"
                            title="Sil"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ALT: AI KAYNAK REFERANSI */}
              <div className="shrink-0 h-[220px] border border-slate-200 rounded-lg bg-slate-800 flex flex-col overflow-hidden shadow-inner hidden xl:flex">
                <div className="bg-slate-900 text-white text-xs p-2.5 truncate font-medium flex items-center justify-between">
                    <span>AI Kaynak Referansı</span>
                    {referenceData && (
                      <span className="bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded text-[10px] font-bold">
                        Sayfa: {referenceData.page}
                      </span>
                    )}
                </div>
                <div className="flex-1 bg-slate-50 relative flex flex-col justify-center items-center text-center overflow-hidden">
                    
                    {referencePdfUrl ? (
                      <iframe 
                        src={`${referencePdfUrl}#page=${referenceData?.page || 1}&view=FitH&search=${encodeURIComponent(referenceData?.keyword || '')}`} 
                        className="w-full h-full border-none"
                        title="AI Kaynak"
                      />
                    ) : (
                      <div className="p-4 flex flex-col items-center">
                        <FileText className="w-8 h-8 mb-2 opacity-30 text-slate-500" />
                        <div className="text-xs font-medium text-slate-400">Yapay zeka bir dokümandan referans verdiğinde burada açılacaktır.</div>
                      </div>
                    )}

                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* BÜYÜK DOKÜMAN OKUMA PENCERESİ (MODAL) */}
        {/* ========================================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-blue/10 p-2 rounded-lg text-brand-blue">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      {previewDoc?.filename || previewDoc?.name || previewDoc?.file_name || previewDoc?.title || 'Doküman Görüntüleyici'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Tam Ekran Okuma Modu</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 text-slate-500 rounded-xl transition-all shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 bg-slate-200 relative">
                {isPdfLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10">
                     <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4 shadow-md"></div>
                     <div className="text-sm text-slate-600 font-bold tracking-wide">Dosya Sunucudan Çekiliyor...</div>
                  </div>
                ) : pdfUrl ? (
                  <iframe 
                    src={`${pdfUrl}#toolbar=1&view=FitH`} 
                    className="w-full h-full border-none bg-slate-100" 
                    title="PDF Tam Ekran"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-red-500">
                    <X className="w-12 h-12 mb-3" />
                    <div className="text-sm font-bold">Dosya içeriği yüklenemedi!</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default App;