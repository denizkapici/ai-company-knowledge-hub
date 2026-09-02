from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

from app.core.config import settings

# 1. LLM Başlatma (Gemini Flash ve Streaming Aktif)
# temperature=0.2 kullanıyoruz çünkü botun yaratıcı olmasını değil, sadece belgelere sadık, net cevaplar vermesini istiyoruz.
llm = ChatGoogleGenerativeAI(
    model=settings.GEMINI_MODEL_NAME,
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.2, 
    streaming=True
)

# 2. Kurşun Geçirmez Sistem Promptu (Prompt Engineering) - HAFIZA EKLENDİ
# Bu kısım LLM'in belgeler dışına çıkmasını engeller ve geçmiş sohbeti hatırlamasını sağlar.
RAG_PROMPT_TEMPLATE = """
Sen Kodpit için geliştirilmiş profesyonel bir Kurumsal Veri ve Doküman Analiz asistanısın.
Aşağıda sana sağlanan "Bağlam (Context)" içerisindeki bilgileri ve "Sohbet Geçmişi (History)"ni kullanarak kullanıcının "Sorusuna (Question)" cevap ver.

Kurallar:
1. Eğer sorunun cevabı sana verilen bağlamda KESİNLİKLE yoksa, kendi kafandan bilgi (isim, rakam, tarih vb.) üretme. Sadece "Bu bilgiye yüklenen belgelerde ulaşamadım." de.
2. Cevapların profesyonel, net ve kurumsal dile uygun olsun.
3. Mali kayıtlar, çalışan listeleri veya uzun raporlar sorulduğunda bilgileri okunması kolay olması için maddeler halinde özetle.
4. Önceki konuşmalara atıfta bulunuluyorsa mutlaka sohbet geçmişini dikkate al.

Sohbet Geçmişi:
{chat_history}

Bağlam:
{context}

Soru:
{question}

Cevap:
"""

rag_prompt = PromptTemplate(
    template=RAG_PROMPT_TEMPLATE,
    input_variables=["chat_history", "context", "question"]
)

# 3. Asenkron Streaming Fonksiyonu - HISTORY PARAMETRESİ EKLENDİ
async def get_chat_response_stream(question: str, history: list, vector_store):
    try:
        # Adım A: Semantic Search - Soruya en benzeyen 3 belge parçasını (chunk) ChromaDB'den getir.
        docs = vector_store.similarity_search(question, k=3)
        
        # Adım B: Bulunan belgelerin metinlerini tek bir uzun metin olarak birleştir
        context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])
        
        # Adım C: Geçmişi Yapay Zekanın okuyabileceği bir metne çeviriyoruz
        formatted_history = ""
        if history:
            for msg in history:
                role_tr = "Kullanıcı" if msg.role == "user" else "Asistan"
                formatted_history += f"{role_tr}: {msg.content}\n"
        else:
            formatted_history = "Henüz geçmiş sohbet yok."
        
        # Adım D: Prompt'u doldur (Geçmiş, Bağlam ve Soruyu içine yerleştir)
        final_prompt = rag_prompt.format(
            chat_history=formatted_history,
            context=context_text, 
            question=question
        )
        
        # Adım E: LLM'e asenkron istek at ve cevabı parça parça (chunk) yield et (Fırlat)
        async for chunk in llm.astream(final_prompt):
            if chunk.content:
                # SİHİRLİ DOKUNUŞ: Gemini 3.6-flash modeli string yerine liste dönebiliyor.
                # Gelen verinin tipini kontrol edip içindeki saf metni (string) ayıklıyoruz.
                if isinstance(chunk.content, list):
                    for item in chunk.content:
                        # Eğer liste içinde dict (sözlük) varsa ve 'text' anahtarına sahipse
                        if isinstance(item, dict) and "text" in item:
                            yield item["text"]
                        # Eğer doğrudan metinse
                        elif isinstance(item, str):
                            yield item
                # Eğer standart metin olarak geliyorsa direkt fırlat
                elif isinstance(chunk.content, str):
                    yield chunk.content
                # Beklenmedik başka bir tip gelirse onu da zorla metne çevirip fırlat (Çökmeyi önler)
                else:
                    yield str(chunk.content)
                    
    except Exception as e:
        # Kodun çökmesi durumunda terminale kırmızı hata atmak yerine stream'e hata mesajını akıtırız
        yield f"\n[Sistem Hatası: Yapay Zeka yanıt üretirken bir sorun yaşadı -> {str(e)}]"