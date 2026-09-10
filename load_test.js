import http from 'k6/http';
import { sleep, check } from 'k6';

// TEST KURALLARI: Aşamalı Yük (Ramp-up)
export const options = {
  stages: [
    { duration: '10s', target: 20 }, // İlk 10 saniyede kullanıcı sayısını yavaşça 20'ye çıkar
    { duration: '20s', target: 50 }, // 20 saniye boyunca sisteme 50 kişi aynı anda saldırsın
    { duration: '10s', target: 0 },  // Son 10 saniyede kullanıcı sayısını yavaşça sıfıra indir
  ],
};

export default function () {
  // FastAPI Backend Login ucuna istek atıyoruz
  const url = 'http://localhost:8000/auth/login';
  const payload = 'username=test@sirket.com&password=strestesti';
  
  const params = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  const res = http.post(url, payload, params);

  // Yanıtların başarılı (veya yetkisiz bile olsa sunucudan dönmüş) olduğunu kontrol et
  check(res, {
    'Sunucu ayakta mı? (200 veya 401)': (r) => r.status === 200 || r.status === 401,
    'Yanıt süresi < 500ms mi?': (r) => r.timings.duration < 500,
  });

  // İstekler arası 1 saniye bekle
  sleep(1);
}