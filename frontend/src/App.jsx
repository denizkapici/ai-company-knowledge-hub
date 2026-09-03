import React, { useState } from 'react';
import { Home, MessageSquare, Settings, User, Plus, Send, UploadCloud, X, FileText, Lock, Mail, LogOut } from 'lucide-react';

function App() {
  // --- STATE (DURUM) YÖNETİMİ ---
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Kullanıcı giriş yaptı mı?
  const [email, setEmail] = useState(''); // Login formundaki e-posta
  const [password, setPassword] = useState(''); // Login formundaki şifre
  const [loginError, setLoginError] = useState(''); // Giriş hata mesajı
  const [isLoading, setIsLoading] = useState(false); // Giriş yaparken bekleme durumu
  
  const [message, setMessage] = useState(''); // Chat ekranındaki input

  // Çıkış Yapma İşlemi
  const handleLogout = () => {
    localStorage.removeItem('access_token'); // Çıkışta token'ı temizle
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
  };

  // ==========================================
  // 🛡️ GÜVENLİ API İSTEK FONKSİYONU (GÜN 1 HEDEFİ)
  // ==========================================
  // Sisteme girdikten sonra backend'e yapacağımız tüm istekleri bununla yapacağız.
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    
    // Her isteğin içine Token'ımızı "Bearer" formatında ekliyoruz
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    // Eğer backend 401 döndürürse (Token süresi bittiyse), kullanıcıyı dışarı atıyoruz
    if (response.status === 401) {
      alert("Oturum süreniz doldu veya yetkisiz işlem. Lütfen tekrar giriş yapın.");
      handleLogout();
      throw new Error("Unauthorized");
    }

    return response;
  };

  // ==========================================
  // 🚀 KORUMALI ENDPOINT TESTİ (Ayarlar İkonuna Bağlı)
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

  // --- GERÇEK API GİRİŞ İŞLEMİ (FASTAPI BAĞLANTISI) ---
  const handleLogin = async (e) => {
    e.preventDefault(); 
    setIsLoading(true);
    setLoginError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', email); 
      formData.append('password', password);

      // İŞTE DÜZELTİLEN YER: Doğru endpoint /auth/login
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
  // EKRAN 1: GİRİŞ YAPILMADIYSA LOGIN GÖSTER
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans text-slate-800">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Form Üst Bilgi / Logo */}
          <div className="bg-brand-dark p-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/40 mb-5 border border-slate-700 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
              <span className="font-black text-3xl tracking-tighter">KH</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Knowledge Hub</h2>
            <p className="text-slate-400 text-sm font-medium">Kurumsal Yapay Zeka</p>
          </div>

          {/* Form Alanı */}
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
          
          {/* TEST BUTONU: Token'ın çalışıp çalışmadığını bu Ayarlar ikonuna basarak test edebilirsin */}
          <Settings 
            onClick={testSecuredEndpoint}
            className="w-6 h-6 hover:text-white cursor-pointer transition-colors text-yellow-500 hover:text-yellow-400" 
            title="Güvenlik Köprüsünü Test Et!" 
          />
          
          <div className="mt-auto pb-4 flex flex-col gap-6 items-center">
            <User className="w-6 h-6 hover:text-white cursor-pointer transition-colors" title="Profil" />
            <LogOut onClick={handleLogout} className="w-5 h-5 text-slate-500 hover:text-red-400 cursor-pointer transition-colors" title="Çıkış Yap" />
          </div>
        </div>
        
        {/* Sohbet Geçmişi */}
        <div className="w-64 bg-slate-50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 font-bold text-lg text-slate-800">
            Knowledge Hub
          </div>
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

      {/* 2. ORTA BÖLÜM: Ana Sohbet Ekranı */}
      <div className="flex-1 flex flex-col bg-white relative">
        <div className="h-16 border-b border-slate-200 flex items-center px-6 font-bold text-lg text-slate-800">
          Chat
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
          <div className="flex justify-end">
            <div className="bg-chat-gray p-4 rounded-2xl rounded-tr-sm max-w-2xl text-slate-800 shadow-sm border border-slate-100">
              Son çeyrek raporuna göre satış hedefleri ne durumda?
            </div>
          </div>
          
          <div className="flex justify-start gap-4">
            <div className="w-8 h-8 rounded-full bg-chat-icon flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="bg-chat-gray p-4 rounded-2xl rounded-tl-sm max-w-2xl text-slate-800 shadow-sm border border-slate-100">
              Satış hedefleri %112 oranında aşıldı <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-semibold cursor-pointer hover:bg-blue-200 transition"></span>. Ancak operasyon maliyetleri de arttı.
            </div>
          </div>
        </div>
        
        {/* Mesaj Gönderme Kutusu */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto flex items-center border border-slate-300 rounded-xl p-2 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue transition bg-white shadow-sm">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask anything..." 
              className="flex-1 outline-none px-3 bg-transparent text-slate-700 placeholder-slate-400 font-medium"
            />
            <button 
              onClick={() => setMessage('')} 
              className="bg-chat-icon hover:bg-emerald-600 text-white p-2.5 rounded-lg transition shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. SAĞ BÖLÜM: Dokümanlar */}
      <div className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0">
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-5 font-bold text-lg text-slate-800">
          Documents & Sources
          <X className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-700 transition" />
        </div>
        
        <div className="p-5 flex flex-col gap-5 overflow-y-auto flex-1">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-500 hover:bg-slate-50 hover:border-brand-blue cursor-pointer transition group">
            <UploadCloud className="w-10 h-10 mb-3 text-slate-400 group-hover:text-brand-blue transition" />
            <div className="font-semibold text-slate-700 mb-1">Upload Document</div>
            <div className="text-xs text-slate-400">Drag-and-drop file zone</div>
          </div>
          
          <div className="flex flex-col gap-2">
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