import React, { useState, useRef, useEffect } from 'react'; 
import { Home, MessageSquare, Settings, User, Plus, Send, UploadCloud, X, FileText, Lock, Mail, LogOut } from 'lucide-react';

function App() {
  // --- STATE (DURUM) YÖNETİMİ ---
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [loginError, setLoginError] = useState(''); 
  const [isLoading, setIsLoading] = useState(false); 
  
  const [message, setMessage] = useState(''); 

  // ==========================================
  // 🆕 CHAT (SOHBET) STATE'LERİ VE AYARLARI
  // ==========================================
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: 'Merhaba! Ben Knowledge Hub asistanıyım. Yüklediğiniz dokümanlar hakkında bana sorular sorabilirsiniz.' }
  ]); 
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Yeni mesaj geldiğinde ekranı otomatik en alta kaydır
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  // ==========================================
  // 📁 DOKÜMAN YÜKLEME (UPLOAD) STATE'LERİ
  // ==========================================
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  // Çıkış Yapma İşlemi
  const handleLogout = () => {
    localStorage.removeItem('access_token'); 
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
  };

  // ==========================================
  // 🛡️ GÜVENLİ API İSTEK FONKSİYONU
  // ==========================================
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      alert("Oturum süreniz doldu veya yetkisiz işlem. Lütfen tekrar giriş yapın.");
      handleLogout();
      throw new Error("Unauthorized");
    }

    return response;
  };

  // ==========================================
  // 🚀 KORUMALI ENDPOINT TESTİ
  // ==========================================
  const testSecuredEndpoint = async () => {
    try {
      const res = await fetchWithAuth('http://localhost:8000/api/v1/documents/db-check');
      const data = await res.json();
      console.log("Korumalı veriler geldi:", data);
      alert(`BAŞARILI! Kapı açıldı.\n\nİstek Yapan: ${data.istegi_yapan}\nVeritabanı Durumu: ${data.veritabani_durumu}`);
    } catch (error) {
      console.error("Test başarısız oldu:", error);
    }
  };

  // --- GERÇEK API GİRİŞ İŞLEMİ ---
  const handleLogin = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);
    setLoginError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', email); 
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        setIsAuthenticated(true); 
      } else {
        setLoginError('E-posta veya şifre hatalı!');
      }
    } catch (error) {
      setLoginError('Sunucuya ulaşılamadı. FastAPI backend açık mı?');
    } finally {
      setIsLoading(false); 
    }
  };

  // ==========================================
  // 💬 YENİ: CHAT (SOHBET) GÖNDERME FONKSİYONLARI (GÜNCELLENDİ)
  // ==========================================
  const handleSendMessage = async () => {
    if (!message.trim()) return; 

    const userText = message;
    
    // Kullanıcının mesajını ekrana yaz ve input'u temizle
    setChatHistory(prev => [...prev, { role: 'user', content: userText }]);
    setMessage('');
    setIsChatLoading(true); 

    try {
      const response = await fetchWithAuth('http://localhost:8000/api/v1/chat/', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText, history: []}) 
      });

      if (response.ok) {
        // 1. Gelen cevabı önce "düz metin" (text) olarak okuyoruz (JSON hatasından kaçınmak için)
        const rawText = await response.text(); 
        
        try {
          // 2. Eğer metin bir JSON ise, parçalayıp içindeki asıl cevabı alıyoruz
          const data = JSON.parse(rawText);
          const aiResponse = data.answer || data.response || data.message || rawText;
          setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
        } catch (e) {
          // 3. Eğer JSON değilse, doğrudan düz metni ekrana basıyoruz
          setChatHistory(prev => [...prev, { role: 'ai', content: rawText }]);
        }
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', content: `❌ Sunucu Hatası: ${response.status}` }]);
      }
    } catch (error) {
      console.error('Chat detaylı hatası:', error);
      // Hatanın GERÇEK sebebini ekrana yazdırıyoruz
      setChatHistory(prev => [...prev, { role: 'ai', content: `❌ İşlem Hatası: ${error.message}` }]);
    } finally {
      setIsChatLoading(false); 
    }
  };

  // Enter tuşuna basınca gönderme tetikleyicisi
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isChatLoading) {
      handleSendMessage();
    }
  };

  // ==========================================
  // 📁 DOKÜMAN YÜKLEME FONKSİYONLARI (Değişmedi)
  // ==========================================
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadMessage(''); 
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile); 

    try {
      const response = await fetchWithAuth('http://localhost:8000/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadMessage('Dosya başarıyla yüklendi! ✅');
        setSelectedFile(null); 
        document.getElementById('file-upload-input').value = ''; 
      } else {
        const errorData = await response.json().catch(() => ({}));
        setUploadMessage(`Hata: ${errorData.detail || 'Yüklenemedi.'} ❌`);
      }
    } catch (error) {
      console.error('Yükleme hatası:', error);
      setUploadMessage('Sunucuya ulaşılamadı. ❌');
    } finally {
      setIsUploading(false);
    }
  };

  // ==========================================
  // EKRAN 1: GİRİŞ YAPILMADIYSA LOGIN GÖSTER
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-brand-dark p-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/40 mb-5 border border-slate-700 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <span className="font-black text-3xl tracking-tighter">KH</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Knowledge Hub</h2>
            <p className="text-slate-400 text-sm font-medium">Kurumsal Yapay Zeka</p>
          </div>
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {loginError && (
                <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-semibold border border-red-100 text-center">
                  {loginError}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Kurumsal E-posta</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition bg-slate-50 focus:bg-white text-slate-700 font-medium"
                    placeholder="ornek@sirket.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Şifre</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition bg-slate-50 focus:bg-white text-slate-700 font-medium"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition shadow-md flex justify-center items-center mt-2 ${
                  isLoading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-brand-blue hover:bg-blue-700 shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/40'
                }`}
              >
                {isLoading ? 'Giriş Yapılıyor...' : 'Sisteme Giriş Yap'}
              </button>
            </form>
            <div className="mt-6 text-center text-sm text-slate-500 font-medium border-t border-slate-100 pt-5">
              Sisteme erişim yetkiniz yok mu? <br/>
              Hesap oluşturmak için lütfen <span className="text-brand-blue font-semibold">BT Yöneticiniz</span> ile iletişime geçin.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // EKRAN 2: GİRİŞ BAŞARILIYSA ANA UYGULAMAYI GÖSTER
  // ==========================================
  return (
    <div className="flex h-screen bg-white font-sans text-slate-800 overflow-hidden">
      
      {/* 1. SOL BÖLÜM: Navigasyon ve Geçmiş */}
      <div className="flex h-full border-r border-slate-200">
        <div className="w-16 bg-brand-dark flex flex-col items-center py-6 gap-8 text-slate-400 shrink-0">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 cursor-pointer hover:scale-105 transition-transform border border-slate-700 relative overflow-hidden group mb-4">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <span className="font-black text-xl tracking-tighter">KH</span>
          </div>
          <Home className="w-6 h-6 hover:text-white cursor-pointer transition-colors" />
          <MessageSquare className="w-6 h-6 text-white cursor-pointer" />
          <Settings onClick={testSecuredEndpoint} className="w-6 h-6 hover:text-white cursor-pointer transition-colors text-yellow-500 hover:text-yellow-400" title="Güvenlik Köprüsünü Test Et!" />
          <div className="mt-auto pb-4 flex flex-col gap-6 items-center">
            <User className="w-6 h-6 hover:text-white cursor-pointer transition-colors" title="Profil" />
            <LogOut onClick={handleLogout} className="w-5 h-5 text-slate-500 hover:text-red-400 cursor-pointer transition-colors" title="Çıkış Yap" />
          </div>
        </div>
        <div className="w-64 bg-slate-50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 font-bold text-lg text-slate-800">Knowledge Hub</div>
          <div className="p-4">
            <button className="w-full bg-brand-blue text-white rounded-lg py-2 flex items-center justify-center gap-2 font-medium hover:bg-blue-700 transition shadow-sm">
              <Plus className="w-5 h-5" /> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="text-xs font-bold text-slate-500 mb-2 px-2 uppercase tracking-wider">Recent Chats</div>
            <div className="bg-slate-200 p-2.5 rounded-lg text-sm text-slate-800 truncate cursor-pointer font-medium mb-1">
              Son çeyrek raporuna göre satış...
            </div>
            <div className="p-2.5 rounded-lg text-sm text-slate-600 truncate hover:bg-slate-200 cursor-pointer transition mb-1">
              KVKK_Metni.docx ve kısıtlamalar
            </div>
          </div>
        </div>
      </div>

      {/* 2. ORTA BÖLÜM: 🆕 DİNAMİK ANA SOHBET EKRANI */}
      <div className="flex-1 flex flex-col bg-white relative">
        <div className="h-16 border-b border-slate-200 flex items-center px-6 font-bold text-lg text-slate-800 shrink-0">
          Chat
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* 🆕 Chat Geçmişini (State) Ekrana Basıyoruz */}
          {chatHistory.map((msg, index) => (
            msg.role === 'user' ? (
              // KULLANICI MESAJI
              <div key={index} className="flex justify-end">
                <div className="bg-chat-gray p-4 rounded-2xl rounded-tr-sm max-w-2xl text-slate-800 shadow-sm border border-slate-100">
                  {msg.content}
                </div>
              </div>
            ) : (
              // YAPAY ZEKA MESAJI
              <div key={index} className="flex justify-start gap-4">
                <div className="w-8 h-8 rounded-full bg-chat-icon flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="bg-chat-gray p-4 rounded-2xl rounded-tl-sm max-w-2xl text-slate-800 shadow-sm border border-slate-100 whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            )
          ))}

          {/* 🆕 Yükleniyor (Typing) Animasyonu */}
          {isChatLoading && (
            <div className="flex justify-start gap-4">
              <div className="w-8 h-8 rounded-full bg-chat-icon flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="bg-chat-gray p-4 rounded-2xl rounded-tl-sm text-slate-500 shadow-sm border border-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}

          {/* Otomatik kaydırma hedefi */}
          <div ref={chatEndRef} />
        </div>
        
        {/* Mesaj Gönderme Kutusu */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center border border-slate-300 rounded-xl p-2 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue transition bg-white shadow-sm">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown} 
              placeholder="Ask anything..." 
              className="flex-1 outline-none px-3 bg-transparent text-slate-700 placeholder-slate-400 font-medium"
              disabled={isChatLoading}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!message.trim() || isChatLoading}
              className="bg-chat-icon hover:bg-emerald-600 disabled:bg-slate-300 text-white p-2.5 rounded-lg transition shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. SAĞ BÖLÜM: Dokümanlar ve Dosya Yükleme Alanı (Değişmedi) */}
      <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0">
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-5 font-bold text-lg text-slate-800">
          Documents & Sources
          <X className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-700 transition" />
        </div>
        
        <div className="p-5 flex flex-col gap-5 overflow-y-auto flex-1">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-center transition bg-slate-50 hover:bg-white hover:border-brand-blue">
            <UploadCloud className={`w-8 h-8 mb-3 transition ${selectedFile ? 'text-brand-blue' : 'text-slate-400'}`} />
            
            <input
              id="file-upload-input"
              type="file"
              onChange={handleFileChange}
              className="mb-4 block w-full text-xs text-slate-500
                file:mr-3 file:py-2 file:px-3
                file:rounded-lg file:border-0
                file:text-xs file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100 cursor-pointer"
            />

            <button
              type="button"
              onClick={handleFileUpload}
              disabled={!selectedFile || isUploading}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm flex justify-center items-center ${
                !selectedFile || isUploading
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-brand-blue text-white hover:bg-blue-700 hover:shadow-md"
              }`}
            >
              {isUploading ? "Yükleniyor..." : "Dosyayı Yükle"}
            </button>

            {uploadMessage && (
              <p className={`mt-3 text-xs font-semibold ${uploadMessage.includes("Hata") || uploadMessage.includes("Lütfen") || uploadMessage.includes("ulaşılamadı") ? "text-red-500" : "text-emerald-600"}`}>
                {uploadMessage}
              </p>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="text-xs font-bold text-slate-500 mb-1 px-1 uppercase tracking-wider">Mevcut Dosyalar</div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition cursor-pointer">
              <div className="bg-red-100 p-2 rounded text-red-600">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-sm font-semibold truncate flex-1 text-slate-700">Q3_Satish_Raporu.pdf</div>
            </div>
          </div>

          <div className="mt-2 flex-1 border border-slate-200 rounded-lg bg-slate-800 flex flex-col overflow-hidden min-h-[250px] shadow-inner">
             <div className="bg-slate-900 text-white text-xs p-2.5 truncate font-medium flex items-center justify-between">
                <span>Q3_Satish_Raporu.pdf</span>
                <span className="text-slate-400">p. 12</span>
             </div>
             <div className="flex-1 bg-white m-3 rounded text-[10px] p-4 text-slate-400 overflow-hidden relative shadow-sm border border-slate-200">
                <div className="w-3/4 h-2 bg-slate-200 mb-3 rounded"></div>
                <div className="w-full h-2 bg-slate-200 mb-3 rounded"></div>
                <div className="w-full h-16 bg-blue-50 mb-3 rounded opacity-70 border border-blue-200"></div>
             </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default App;