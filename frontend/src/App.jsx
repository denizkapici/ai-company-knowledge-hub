import React, { useState, useRef, useEffect } from 'react'; 
// YENİ: Edit2 ve Check ikonları eklendi
import { Home, MessageSquare, Settings, User, Plus, Send, UploadCloud, X, FileText, Lock, Mail, LogOut, ShieldCheck, Users, MessageCircle, Sparkles, Trash2, Menu, Building, Edit2, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  // --- STATE (DURUM) YÖNETİMİ ---
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [loginError, setLoginError] = useState(''); 
  const [isLoading, setIsLoading] = useState(false); 

  // EKRAN GÖRÜNÜMÜ KONTROLÜ
  const [activeView, setActiveView] = useState('chat'); 
  const [message, setMessage] = useState(''); 
  
  // YENİ: Mobil Menü State'i
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sisteme giriş yapan kullanıcının rolü
  const [userRole, setUserRole] = useState(null); 
  const [currentUserId, setCurrentUserId] = useState(null); 

  // ==========================================
  // 💬 CHAT SİSTEMİ STATE'LERİ
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
  // 📁 DOKÜMAN YÜKLEME VE LİSTELEME
  // ==========================================
  const [selectedFile, setSelectedFile] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  
  const [documents, setDocuments] = useState([]); 
  const [previewDoc, setPreviewDoc] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null); 
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [uploadDepartmentId, setUploadDepartmentId] = useState('');

  // ==========================================
  // 🛡️ ADMIN PANELİ STATE'LERİ 
  // ==========================================
  const [usersList, setUsersList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState({ type: '', text: '' });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee', department_id: '' });

  // ==========================================
  // 🏢 DEPARTMAN YÖNETİMİ STATE'LERİ (YENİ)
  // ==========================================
  const [newDeptName, setNewDeptName] = useState('');
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');

  // ==========================================
  // ✨ AI DOKÜMAN ÖZETLEME STATE'LERİ 
  // ==========================================
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const [summaryDocTitle, setSummaryDocTitle] = useState('');
  const [summaryLoadingDocId, setSummaryLoadingDocId] = useState(null);

  // Çıkış Yapma
  const handleLogout = () => {
    localStorage.removeItem('access_token'); 
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setUserRole(null); 
    setCurrentUserId(null);
    setChatSessions([]);
    setActiveSessionId(null);
    setChatHistory([]);
    setReferenceData(null); 
    setReferencePdfUrl(null);
    toast.success('Başarıyla çıkış yapıldı.');
  };

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

  const handleNewChat = async () => {
    setIsMobileMenuOpen(false); // Yeni sohbete tıklayınca menüyü kapat
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

  const handleSelectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    setChatHistory([]); 
    setIsChatLoading(true);
    setReferenceData(null); 
    setReferencePdfUrl(null);
    setIsMobileMenuOpen(false); // Sohbete tıklayınca mobilde menüyü kapat

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
        setCurrentUserId(data.id);
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

  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUserId && newRole !== 'admin') {
        toast.error("Kendi Admin yetkinizi düşüremezsiniz!");
        return;
    }

    try {
      const response = await fetchWithAuth(`http://localhost:8000/users/${userId}/role`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }) 
      });

      if (response.ok) {
        toast.success("Kullanıcı yetkisi güncellendi.");
        fetchAdminData();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Yetki güncellenemedi.");
      }
    } catch (error) {
      toast.error("Sunucuya ulaşılamadı.");
    }
  };

  const confirmDeleteUser = (usr) => {
    if (usr.id === currentUserId) {
        toast.error("Kendi hesabınızı silemezsiniz!");
        return;
    }

    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-bold text-slate-800">"{usr.name}" kullanıcısını silmek istediğinize emin misiniz?</span>
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
              executeDeleteUser(usr.id);
            }} 
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition shadow-sm"
          >
            Evet, Sil
          </button>
        </div>
      </div>
    ), { duration: 6000, id: `delete-user-${usr.id}` });
  };

  const executeDeleteUser = async (userId) => {
    try {
      const response = await fetchWithAuth(`http://localhost:8000/users/${userId}`, { method: 'DELETE' });
      if (response.ok) { 
        toast.success('Kullanıcı sistemden tamamen silindi.');
        fetchAdminData();
      } else { 
        const err = await response.json();
        toast.error(err.detail || 'Kullanıcı silinemedi.'); 
      }
    } catch (error) { 
      toast.error('Sunucuya ulaşılamadı. Silme işlemi başarısız.'); 
    }
  };

  // ==========================================
  // YENİ: DEPARTMAN CRUD İŞLEMLERİ 
  // ==========================================
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setIsAddingDept(true);
    try {
      const response = await fetchWithAuth('http://localhost:8000/departments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName })
      });
      if (response.ok) { 
        toast.success("Departman başarıyla oluşturuldu!"); 
        setNewDeptName(''); 
        fetchAdminData(); 
      } else { 
        toast.error("Departman eklenemedi."); 
      }
    } catch (e) { 
      toast.error("Sunucuya ulaşılamadı."); 
    } finally { 
      setIsAddingDept(false); 
    }
  };

  const handleUpdateDepartment = async (deptId) => {
    if (!editDeptName.trim()) return;
    try {
      const response = await fetchWithAuth(`http://localhost:8000/departments/${deptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editDeptName })
      });
      if (response.ok) { 
        toast.success("Departman güncellendi!"); 
        setEditingDeptId(null); 
        fetchAdminData(); 
      } else { 
        toast.error("Departman güncellenemedi."); 
      }
    } catch (e) { 
      toast.error("Sunucuya ulaşılamadı."); 
    }
  };

  const confirmDeleteDept = (dep) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-bold text-slate-800">"{dep.name}" departmanını silmek istediğinize emin misiniz?</span>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition">
            İptal
          </button>
          <button onClick={() => { toast.dismiss(t.id); executeDeleteDept(dep.id); }} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition shadow-sm">
            Evet, Sil
          </button>
        </div>
      </div>
    ), { duration: 6000, id: `delete-dept-${dep.id}` });
  };

  const executeDeleteDept = async (deptId) => {
    try {
      const response = await fetchWithAuth(`http://localhost:8000/departments/${deptId}`, { method: 'DELETE' });
      if (response.ok) { 
        toast.success("Departman başarıyla silindi!"); 
        fetchAdminData(); 
      } else { 
        toast.error("Silinemedi. Bu departmana bağlı kullanıcı veya belgeler olabilir."); 
      }
    } catch (e) { 
      toast.error("Sunucuya ulaşılamadı."); 
    }
  };

  const handleSummarizeDocument = async (doc, e) => {
    e.stopPropagation(); 
    const docId = doc.id || doc._id || doc.document_id;
    const docName = doc.filename || doc.name || doc.file_name || doc.title || 'Doküman';
    
    setSummaryLoadingDocId(docId); 
    
    try {
      const response = await fetchWithAuth(`http://localhost:8000/documents/${docId}/summary`);
      if (response.ok) {
        const data = await response.json();
        setSummaryContent(data.summary);
        setSummaryDocTitle(docName);
        setIsSummaryModalOpen(true);
      } else {
        toast.error('Özet alınırken bir hata oluştu. Henüz işlenmemiş olabilir.');
      }
    } catch (error) {
      toast.error('Sunucuya ulaşılamadı. Özet işlemi başarısız.');
    } finally {
      setSummaryLoadingDocId(null);
    }
  };

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
      if (response.ok) { 
        const blob = await response.blob(); 
        const mimeType = blob.type || 'application/pdf';
        const fileBlob = new Blob([blob], { type: mimeType });
        setPdfUrl(URL.createObjectURL(fileBlob)); 
      }
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
      
      let hasFetchedRef = false; 

      setChatHistory(prev => [...prev, { role: 'ai', content: '' }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          aiFullResponse += chunk;
          
          let displayContent = aiFullResponse;
          const refMatch = aiFullResponse.match(/\[\[REF:(.*?)\]\]/);
          
          if (refMatch && !hasFetchedRef) {
            hasFetchedRef = true; 
            try {
              const refParsed = JSON.parse(refMatch[1]);
              
              const cleanText = userText.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, ' '); 
              const words = cleanText.split(/\s+/).filter(w => w.length > 5); 
              const searchKeyword = words.length > 0 ? words.sort((a, b) => b.length - a.length)[0] : cleanText.split(' ')[0];

              setReferenceData({ page: refParsed.page, keyword: searchKeyword });
              
              let matchedDoc = documents.find(d => {
                const docName = (d.title || d.filename || d.name || "").toLowerCase().trim();
                const refName = (refParsed.source || "").toLowerCase().trim();
                
                if (docName === refName) return true;
                
                const cleanDoc = docName.replace(/\.[^/.]+$/, "");
                const cleanSource = refName.replace(/\.[^/.]+$/, "");
                
                return cleanDoc === cleanSource || docName.includes(cleanSource) || refName.includes(cleanDoc);
              });
              
              if (matchedDoc) {
                const docId = matchedDoc.id || matchedDoc._id || matchedDoc.document_id;

                fetchWithAuth(`http://localhost:8000/documents/${docId}/download`)
                  .then(res => {
                     if (!res.ok) throw new Error("Dosya indirilemedi");
                     return res.blob();
                  })
                  .then(blob => {
                    const mimeType = blob.type || 'application/pdf';
                    const fileBlob = new Blob([blob], { type: mimeType });
                    setReferencePdfUrl(URL.createObjectURL(fileBlob));
                  })
                  .catch(err => console.error("Referans dosya çekilemedi:", err));
              }
            } catch (e) {
              console.error("Referans ayrıştırma hatası:", e);
            }
          }
          
          displayContent = aiFullResponse.replace(/\[\[REF:.*?\]\]/g, '');

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

  const handleFileChange = (event) => { 
    if (event.target.files && event.target.files.length > 0) { 
      setSelectedFile(Array.from(event.target.files)); 
      setUploadMessage(`${event.target.files.length} dosya seçildi.`); 
    } else {
      setSelectedFile(null);
      setUploadMessage('');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || selectedFile.length === 0) return;
    setIsUploading(true); setUploadMessage('');
    const formData = new FormData(); 
    
    selectedFile.forEach(file => {
      formData.append('files', file); 
    });

    if (uploadDepartmentId !== '') {
      formData.append('department_id', uploadDepartmentId);
    }
    
    try {
      const response = await fetchWithAuth('http://localhost:8000/documents/upload', { method: 'POST', body: formData });
      if (response.ok) { 
        setUploadMessage('Dosyalar başarıyla yüklendi! ✅'); 
        toast.success('Dosyalar başarıyla yüklendi!');
        setSelectedFile(null); 
        setUploadDepartmentId(''); 
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

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen bg-white font-sans text-slate-800 overflow-hidden relative">
        
        {/* YENİ: MOBİL ARKA PLAN KARARTMASI */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* YENİ: SOL MENÜ - Mobil uyumlu (fixed/relative geçişi) */}
        <div className={`fixed md:relative z-50 flex h-full border-r border-slate-200 bg-white transition-transform duration-300 shadow-2xl md:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="w-16 bg-brand-dark flex flex-col items-center py-6 gap-8 text-slate-400 shrink-0">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 cursor-pointer hover:scale-105 transition-transform border border-slate-700 mb-4">
              <span className="font-black text-xl tracking-tighter">KH</span>
            </div>
            
            {/* Navigasyonda menüyü mobilde kapatma eklendi */}
            <MessageSquare 
              onClick={() => { setActiveView('chat'); setIsMobileMenuOpen(false); }} 
              className={`w-6 h-6 cursor-pointer transition-colors ${activeView === 'chat' ? 'text-white' : 'hover:text-white'}`} 
              title="Chat Ekranı"
            />
            
            <Settings onClick={testSecuredEndpoint} className="w-6 h-6 hover:text-white cursor-pointer transition-colors text-yellow-500 hover:text-yellow-400" />
            
            <div className="mt-auto pb-4 flex flex-col gap-6 items-center">
              {userRole === 'admin' && (
                <User 
                  onClick={() => { setActiveView('admin'); setIsMobileMenuOpen(false); }} 
                  className={`w-6 h-6 cursor-pointer transition-colors ${activeView === 'admin' ? 'text-brand-blue bg-white rounded-full p-0.5' : 'hover:text-white'}`} 
                  title="Admin Paneli"
                />
              )}
              <LogOut onClick={handleLogout} className="w-5 h-5 text-slate-500 hover:text-red-400 cursor-pointer transition-colors" title="Çıkış Yap" />
            </div>
          </div>
          
          <div className="w-64 bg-slate-50 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 font-bold text-lg text-slate-800 flex justify-between items-center">
              Knowledge Hub
              <button className="md:hidden text-slate-400 hover:text-slate-700" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <button onClick={handleNewChat} className="w-full bg-brand-blue text-white rounded-lg py-2 flex items-center justify-center gap-2 font-medium hover:bg-blue-700 transition shadow-sm">
                <Plus className="w-5 h-5" /> New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="text-xs font-bold text-slate-500 mb-2 px-2 uppercase tracking-wider">Recent Chats</div>
              
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

        <div className="flex-1 flex flex-col bg-white relative overflow-hidden w-full">
          
          {/* YENİ: MOBİL İÇİN HAMBURGER MENÜ HEADER'I */}
          <div className="md:hidden h-16 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 bg-white">
            <div className="font-bold text-lg flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-500 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm">KH</div>
              <span className="text-slate-800">Knowledge Hub</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {activeView === 'chat' ? (
            
            <>
              <div className="h-16 border-b border-slate-200 flex items-center px-6 font-bold text-lg text-slate-800 shrink-0 hidden md:flex">
                 {activeSessionId ? (chatSessions.find(s => s.id === activeSessionId)?.title || "Chat") : "Chat"}
              </div>
              
              <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-6">
                {chatHistory.map((msg, index) => (
                  msg.role === 'user' ? (
                    <div key={index} className="flex justify-end">
                      <div className="bg-slate-800 text-white p-4 rounded-2xl rounded-tr-sm max-w-[85%] md:max-w-2xl shadow-sm border border-slate-700">{msg.content}</div>
                    </div>
                  ) : (
                    <div key={index} className="flex justify-start gap-3 md:gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white shrink-0 mt-1 shadow-sm"><MessageSquare className="w-4 h-4" /></div>
                      <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-sm max-w-[85%] md:max-w-2xl text-slate-800 shadow-sm border border-slate-200 whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  )
                ))}

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
              
              <div className="p-3 md:p-4 bg-white border-t border-slate-100 shrink-0">
                <div className="max-w-4xl mx-auto flex items-center border border-slate-300 rounded-xl p-1.5 md:p-2 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue transition bg-white shadow-sm">
                  <input 
                    type="text" 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    onKeyDown={handleKeyDown} 
                    placeholder={activeSessionId ? "Ask anything..." : "Lütfen yeni bir sohbet başlatın..."} 
                    className="flex-1 outline-none px-2 md:px-3 bg-transparent text-slate-700 placeholder-slate-400 font-medium text-sm md:text-base" 
                    disabled={isChatLoading || !activeSessionId} 
                  />
                  <button 
                    onClick={handleSendMessage} 
                    disabled={!message.trim() || isChatLoading || !activeSessionId} 
                    className="bg-brand-blue hover:bg-blue-700 disabled:bg-slate-300 text-white p-2 md:p-2.5 rounded-lg transition shadow-sm shrink-0"
                  >
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
            </>

          ) : (
            
            <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
              <div className="h-16 border-b border-slate-200 bg-white flex items-center px-6 font-bold text-lg text-slate-800 shrink-0 gap-2 shadow-sm hidden md:flex">
                <ShieldCheck className="w-6 h-6 text-brand-blue" />
                Sistem Yönetimi (Admin Paneli)
              </div>

              <div className="p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* YENİ: ADMIN DASHBOARD GRAFİKLERİ BURAYA EKLENDİ */}
                <div className="xl:col-span-3">
                  <AdminDashboard />
                </div>
                
                <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] md:h-[700px]">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-500" />
                    <h3 className="font-bold text-slate-700">Mevcut Kullanıcılar</h3>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-4">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b-2 border-slate-200 text-sm text-slate-500">
                          <th className="pb-3 font-semibold px-2">ID</th>
                          <th className="pb-3 font-semibold px-2">Ad Soyad</th>
                          <th className="pb-3 font-semibold px-2">E-posta</th>
                          {/* YENİ: Departman Sütunu */}
                          <th className="pb-3 font-semibold px-2">Departman</th>
                          <th className="pb-3 font-semibold px-2">Yetki (Rol)</th>
                          <th className="pb-3 font-semibold px-2">Durum</th>
                          <th className="pb-3 font-semibold px-2 text-right">İşlem</th> 
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {usersList.length === 0 ? (
                          <tr><td colSpan="7" className="text-center py-8 text-slate-400">Henüz kullanıcı bulunmuyor.</td></tr>
                        ) : (
                          usersList.map((usr) => (
                            <tr key={usr.id} className="border-b border-slate-100 hover:bg-slate-50 transition group">
                              <td className="py-3 px-2 font-medium text-slate-500">#{usr.id}</td>
                              <td className="py-3 px-2 font-bold text-slate-800">{usr.name}</td>
                              <td className="py-3 px-2 text-slate-600">{usr.email}</td>
                              
                              {/* YENİ: Departman Verisi Eşleştiriliyor */}
                              <td className="py-3 px-2">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-slate-200">
                                  {departments.find(d => d.id === usr.department_id)?.name || 'Atanmadı / Global'}
                               </span>
                              </td>

                              <td className="py-3 px-2">
                                <select 
                                  value={usr.role} 
                                  onChange={(e) => handleRoleChange(usr.id, e.target.value)}
                                  disabled={usr.id === currentUserId}
                                  className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide cursor-pointer outline-none border focus:ring-2 focus:ring-brand-blue transition
                                    ${usr.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                                      usr.role === 'manager' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                                      'bg-slate-100 text-slate-600 border-slate-200'}
                                    ${usr.id === currentUserId ? 'opacity-60 cursor-not-allowed' : ''}
                                  `}
                                >
                                  <option value="employee" className="font-bold text-slate-600 uppercase">Employee</option>
                                  <option value="manager" className="font-bold text-blue-700 uppercase">Manager</option>
                                  <option value="admin" className="font-bold text-purple-700 uppercase">Admin</option>
                                </select>
                              </td>

                              <td className="py-3 px-2">
                                {usr.is_active ? 
                                  <span className="flex items-center gap-1 text-emerald-600 font-semibold"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Aktif</span> : 
                                  <span className="flex items-center gap-1 text-red-500 font-semibold"><div className="w-2 h-2 rounded-full bg-red-500"></div>Pasif</span>
                                }
                              </td>

                              <td className="py-3 px-2 text-right">
                                <button 
                                  onClick={() => confirmDeleteUser(usr)}
                                  disabled={usr.id === currentUserId}
                                  className={`p-1.5 rounded transition ${usr.id === currentUserId ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                                  title={usr.id === currentUserId ? 'Kendinizi silemezsiniz' : 'Kullanıcıyı Sil'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>

                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

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

                {/* =========================================================
                    YENİ: DEPARTMAN YÖNETİMİ TABLOSU VE EKLEME FORMU
                    ========================================================= */}
                <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[350px]">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                    <Building className="w-5 h-5 text-slate-500" />
                    <h3 className="font-bold text-slate-700">Departman Yönetimi</h3>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-4">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="border-b-2 border-slate-200 text-sm text-slate-500">
                          <th className="pb-3 font-semibold px-2 w-16">ID</th>
                          <th className="pb-3 font-semibold px-2">Departman Adı</th>
                          <th className="pb-3 font-semibold px-2 text-right">İşlem</th> 
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {departments.length === 0 ? (
                          <tr><td colSpan="3" className="text-center py-8 text-slate-400">Henüz departman bulunmuyor.</td></tr>
                        ) : (
                          departments.map((dep) => (
                            <tr key={dep.id} className="border-b border-slate-100 hover:bg-slate-50 transition group">
                              <td className="py-3 px-2 font-medium text-slate-500">#{dep.id}</td>
                              <td className="py-3 px-2">
                                {editingDeptId === dep.id ? (
                                  <input 
                                    type="text" 
                                    value={editDeptName} 
                                    onChange={(e) => setEditDeptName(e.target.value)} 
                                    className="w-full px-2 py-1 border border-brand-blue rounded-md outline-none text-sm font-bold text-slate-800"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="font-bold text-slate-800">{dep.name}</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {editingDeptId === dep.id ? (
                                  <button onClick={() => handleUpdateDepartment(dep.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded transition" title="Kaydet"><Check className="w-4 h-4" /></button>
                                ) : (
                                  <button onClick={() => { setEditingDeptId(dep.id); setEditDeptName(dep.name); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition" title="Düzenle"><Edit2 className="w-4 h-4" /></button>
                                )}
                                <button onClick={() => confirmDeleteDept(dep)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition ml-1" title="Sil"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-fit">
                  <h3 className="font-bold text-slate-700 text-lg mb-5 border-b border-slate-100 pb-3">Yeni Departman Ekle</h3>
                  <form onSubmit={handleAddDepartment} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Departman Adı</label>
                      <input type="text" required value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-blue bg-slate-50 text-sm font-medium" placeholder="Örn: İnsan Kaynakları" />
                    </div>
                    <button type="submit" disabled={isAddingDept || !newDeptName.trim()} className={`w-full text-white font-bold py-3 mt-4 rounded-xl transition shadow-md flex justify-center items-center ${isAddingDept || !newDeptName.trim() ? 'bg-brand-blue/60 cursor-not-allowed' : 'bg-brand-blue hover:bg-blue-700'}`}>
                      {isAddingDept ? 'Ekleniyor...' : 'Departman Ekle'}
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}
        </div>

        {activeView === 'chat' && (
          // YENİ: Mobilde sağ paneli tamamen gizliyoruz (hidden xl:flex), böylece chat ekranı ezilmiyor
          <div className="w-80 border-l border-slate-200 bg-white flex-col shrink-0 relative z-10 hidden xl:flex">
            
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-5 font-bold text-lg text-slate-800 shrink-0">
              Documents & Sources
              <X className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-700 transition" />
            </div>
            
            <div className="p-5 flex flex-col gap-5 overflow-hidden flex-1">
              
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-center transition bg-slate-50 hover:bg-white hover:border-brand-blue shrink-0">
                <UploadCloud className={`w-8 h-8 mb-3 transition ${selectedFile && selectedFile.length > 0 ? 'text-brand-blue' : 'text-slate-400'}`} />
                
                <select 
                  value={uploadDepartmentId}
                  onChange={(e) => setUploadDepartmentId(e.target.value)}
                  className="mb-3 w-full px-2 py-1.5 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-blue bg-white cursor-pointer"
                >
                  <option value="">🌍 Tüm Şirkete Açık (Global)</option>
                  {departments.map(dep => (
                    <option key={dep.id} value={dep.id}>📁 {dep.name}</option>
                  ))}
                </select>

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
              
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="text-xs font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider shrink-0">Mevcut Dosyalar</div>
                
                <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 pb-1">
                  {documents.length === 0 ? (
                    <div className="text-sm text-slate-400 italic px-2">Henüz dosya bulunmuyor.</div>
                  ) : (
                    documents.map((doc, index) => {
                      
                      const docName = doc.filename || doc.name || doc.file_name || doc.title || `İsimsiz Dosya ${index + 1}`;
                      const status = doc.status || 'PROCESSED'; 
                      const docIdForLoading = doc.id || doc._id || doc.document_id;
                      
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

                          <div className="opacity-0 group-hover:opacity-100 flex items-center transition shrink-0">
                            
                            <button 
                              onClick={(e) => handleSummarizeDocument(doc, e)}
                              disabled={summaryLoadingDocId === docIdForLoading || status === 'PENDING' || status === 'FAILED'}
                              className="p-1.5 mr-1 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded transition disabled:opacity-50"
                              title="✨ Yapay Zeka ile Özetle"
                            >
                              {summaryLoadingDocId === docIdForLoading ? (
                                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </button>

                            <button 
                              onClick={(e) => confirmDeleteDocument(doc, e)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                              title="Sil"
                            >
                              <X className="w-4 h-4" />
                            </button>

                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

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

        {/* MODALLER (Doküman Önizleme ve Özetleme modalleri eskisi gibi devam ediyor) */}
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

        {isSummaryModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg text-purple-600 shadow-sm border border-purple-200">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      Yönetici Özeti
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate max-w-md">{summaryDocTitle}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="p-2 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 text-slate-500 rounded-xl transition-all shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh] bg-white">
                <div className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                  {summaryContent}
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                <button 
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition shadow-sm text-sm"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// ==========================================
// 📊 YENİ: ADMİN DASHBOARD BİLEŞENLERİ 
// (App fonksiyonunun dışında tanımlandı, mevcut yapıyı bozmaz)
// ==========================================
const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4 transition-transform hover:-translate-y-1">
    <div className={`${color} text-white p-4 rounded-lg shadow-inner`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value !== undefined ? value : '...'}</h3>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  // Token'ı localStorage'dan doğrudan çekiyoruz ki fetchWithAuth prop'una ihtiyaç olmasın
  const token = localStorage.getItem('access_token'); 

  React.useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('http://localhost:8000/users/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("İstatistikler çekilemedi:", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) loadStats();
  }, [token]);

  if (loading) return <div className="p-8 text-slate-500 font-semibold animate-pulse">Analitik Verileri Yükleniyor...</div>;
  if (!stats) return <div className="p-8 text-red-500">Veri çekilirken hata oluştu veya yetkiniz yok.</div>;

  return (
    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        📊 Sistem Analitiği
      </h2>

      {/* Üst Kısım: Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Toplam Kullanıcı" value={stats.summary?.total_users} icon={<Users size={24} />} color="bg-blue-500" />
        <StatCard title="Yüklü Belgeler" value={stats.summary?.total_docs} icon={<FileText size={24} />} color="bg-indigo-500" />
        <StatCard title="Yapay Zeka Sohbeti" value={stats.summary?.total_chats} icon={<MessageSquare size={24} />} color="bg-green-500" />
        <StatCard title="Departmanlar" value={stats.summary?.total_departments} icon={<Building size={24} />} color="bg-purple-500" />
      </div>

      {/* Alt Kısım: Grafik */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-8">
        <h3 className="text-base font-semibold text-slate-700 mb-6">Departman Bazlı Kullanıcı Dağılımı</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chart_data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="kullaniciSayisi" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default App;