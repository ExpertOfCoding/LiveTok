# 🚀 LiveTok: TikTok to Minecraft & Overlay Bridge

LiveTok, TikTok canlı yayın etkileşimlerini (hediye, takip, yorum) gerçek zamanlı olarak hem Minecraft sunucunuza (komut olarak) hem de OBS overlays sayfalarınıza (medya/ses olarak) aktaran modern ve güçlü bir otomasyon sistemidir.

---

## 🛠️ Kurulum Rehberi (Installation)

Sistemi çalıştırmak için üç ana bileşenin (Go, Next.js, Python) kurulması gerekmektedir.

### 1. Go Backend (Sunucu)
- [Go (1.21+)](https://go.dev/dl/) yüklü olduğundan emin olun.
- Ana dizinde bağımlılıkları yükleyin:
  ```powershell
  go mod tidy
  ```
- Sunucuyu başlatın:
  ```powershell
  go run .
  ```

### 2. Next.js UI (Dashboard & Overlay)
- [Node.js (18+)](https://nodejs.org/) yüklü olduğundan emin olun.
- `UI` klasörüne gidin:
  ```powershell
  cd UI
  npm install
  ```
- Arayüzü başlatın:
  ```powershell
  npm run dev -- -p 5000
  ```

### 3. Python TTS (Seslendirme & Dil Modelleri)
Bu bölüm yapay zeka tabanlı seslendirme (TTS) için gereklidir.
- **Python (3.10+)** yüklü olmalıdır.
- `python` klasöründe gerekli kütüphaneleri yükleyin:
  ```powershell
  cd python
  pip install -r requirements.txt
  ```
- **Dil Modellerinin Kurulumu (Önemli):**
  - [Piper GitHub](https://github.com/rhasspy/piper) sayfasından `piper.exe` dosyasını indirin ve `python/` klasörüne atın.
  - [Hugging Face - Piper Models](https://huggingface.co/rhasspy/piper-checkpoints/tree/main/tr/tr_TR) üzerinden `tr_TR-dfki-medium.onnx` ve `.json` dosyalarını indirin.
  - Bu dosyaları `python/` klasörünün içine yerleştirin.
- TTS sunucusunu başlatın:
  ```powershell
  python main.py
  ```

---

## ✅ Tamamlanan Özellikler

- **Zeki Kuyruk & Flash Modu**: Hediyeleri sıraya koyma veya `skip_on_next_action` ile anında ekrana basma.
- **Smart Queuing**: Sadece aktif olan (açık olan) ekranlar için veri işleme.
- **Dinamik Dashboard**: Tüm ayarların web üzerinden yönetilmesi.
- **Centered Layout**: Tüm görseller ve kullanıcı bilgileri ekranın tam ortasında yüksek etkileşimli görünür.

## 🚀 Gelecek Planları

- **Audio/MP3 Desteği**: Bağımsız ses dosyalarını tetikleme.
- **Cloudflare Tunnel**: Localhost'u güvenli şekilde dış dünyaya açma.
- **Auto-Startup Script**: Tüm sistemleri tek tıkla başlatan script.
- **User Info Aktarımı**: Detaylı kullanıcı profil yönetimi.

---

## ⚠️ Git İsteri (Git Ignore)
Büyük boyutlu oldukları için aşağıdaki dosyalar repoya dahil edilmemiştir, manuel eklenmelidir:
- `python/*.onnx` (Dil modelleri)
- `python/piper.exe` (Ses motoru)
- `UI/node_modules/` (Bağımlılıklar)

---
*LiveTok Team - 2026*
