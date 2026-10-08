# Gitar Repertuar – çalışma kuralları

Kişisel, offline çalışan gitar repertuarı PWA'sı. iPhone'da Safari → "Ana Ekrana Ekle" ile kullanılıyor.
Yayın: https://alterians.github.io/gitar-repertuar/ (repo `alterians/gitar-repertuar`, **public**).

## Şarkı ekleme kuralları

1. **Sözler public repoya açık halde girmez.** Kullanıcının şarkıları `ozel/sarkilar/<sanatci-sarki>.txt` dosyasına yazılır
   (`ozel/` gitignore'da). Sonra:
   `node araclar/yayinla.mjs` → `sarkilar.enc.json` (AES-GCM şifreli) üretilir → commit + `git push`.
   Telefon, şifre bir kez girildikten sonra yeni şarkıları kendiliğinden çeker (internet varsa her açılışta en güncel hali).
   - Şifre ve tuz `ozel/anahtar.json` içinde. **Tuzu değiştirme**: telefonda şifre yeniden istenir.
   - `ozel/repertuar.json` açık yedektir (📥 ile elle içe aktarma için), git'e girmez.
   - `songs.js` sadece uydurma sözlü örnekler içindir.
   - Push etmeden önce `git status` ile `ozel/` altından hiçbir şeyin eklenmediğini kontrol et.
2. **Akorun yeri çok önemli.** Akor, kaynakta hangi hecenin üstündeyse o hecenin başına `[Akor]` olarak konur.
   - Kaynak ekran görüntüsüyse göz kararı yapılmaz: akor ve söz satırlarının piksel konumları ölçülür
     (Pillow ile; kırmızı/renkli akor kümeleri ↔ söz harflerinin x konumları), sonra en yakın hece başına oturtulur.
     Eşitlikte (iki heceye eşit uzaklık) önce diğer kıtadaki aynı yere bakılır; orada net ise ona uyulur,
     değilse önceki hece seçilir.
   - Kelime ortasına düşen akor kelimeyi böler: `şar[Dm]kıların`. Bu doğrudur, kelimenin başına kaydırılmaz.
   - Kıtalar arasında konumlar farklıysa kaynağa sadık kalınır, "düzeltilmez".
   - Sadece akorlardan oluşan satırlar (giriş/ara) `[Am] [G] [Am]` olarak ayrı satırda durur.
3. **Kapo ve ton:**
   - `capo:` kaynakta ne yazıyorsa odur. Akorlar kaynaktaki **şekillerle** yazılır, kapoya göre transpoze edilmez.
   - `key:` sadece kaynak *duyulan* tonu açıkça veriyorsa yazılır. Yoksa boş bırakılır; uygulama ilk akor + kapodan hesaplar
     (ör. Am şekli + kapo 5 → Dm).
   - Kapo varsa `notes:` alanına "Şekiller X, kapo N ile duyulan ton Y" yazılır.
4. **Sınıflandırma** (`tags:`, virgülle, küçük harf). Her şarkıya her gruptan bir etiket:
   - Dil: `türkçe` / `yabancı`
   - Ruh hali: `hüzünlü`, `aşk`, `neşeli`, `isyan`, `nostalji`, `huzur` (gerekirse 2 tane)
   - Tempo: `slow` / `orta tempo` / `hızlı`
   - Zorluk: `kolay` (sadece açık akorlar) / `orta` (1–2 bare akor, ör. F, Bm) / `zor` (çok bare, hızlı geçişler)
   - Uygunsa ekstra: `türkü`, `rock`, `pop`, `arabesk`, `sanat`, `film`
   - Bir de şarkıya uyan bir `emoji:` seçilir.
     Kartta emoji yerine renkli kutu + çizgi simge çıkar: renk ruh halinden, simge emojiden (`EMOJI_IC`, app.js:
     💔 ❤️ 🥀 🌹 🔥 🌙 ☀️ 🌧️ 😢 🍂 🌿 🎸 🎵 📻 🙏 ✨ ⭐). Listede olmayan emoji → ruh hali simgesi.
5. Bare akor varsa (F, Bm…) `notes:` alanına kolay alternatif önerilir (ör. F → Fmaj7 `xx3210`).

## Dosya biçimi (`ozel/sarkilar/*.txt`)

```
title: Şarkı Adı
artist: Sanatçı
capo: 5
emoji: 🥀
tags: türkçe, hüzünlü, slow, orta
notes: Şekiller Am, kapo 5 ile duyulan ton Dm.
---
# Giriş
[Am] [G]

# 1. Kıta
[Am]Söz söz [Dm]söz
```

## Uygulama kodu değişince

`git push` yeterli (Pages otomatik yayınlar). `sw.js` dosya listesi değişirse `VERSION` artırılır.
Kullanıcı telefonda güncellemeyi internete bağlıyken uygulamayı iki kez açarak alır.
