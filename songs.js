/*
  ŞARKI LİSTESİ
  =============
  Her şarkı { ... } bloğudur. Sadece title ve content zorunlu, gerisi isteğe bağlı.

  title   : Şarkı adı
  artist  : Sanatçı
  capo    : Kapo perdesi (yoksa 0 ya da hiç yazma)
  key     : DUYULAN ton (kapo dahil). Yazmazsan ilk akor + kapodan hesaplanır.
  bpm     : Tempo
  emoji   : Listede görünecek simge
  tags    : Etiketler, ör. ["türkçe", "slow"]
  notes   : Ritim, tutuş vb. kısa not
  content : Sözler + akorlar. İki yazım da olur, karıştırabilirsin:

     1) Köşeli parantez:   [Am]Yağmur yağar [F]ince ince
     2) Akor satırı üstte:  Am           F
                            Yağmur yağar ince ince

     # Nakarat   -> bölüm başlığı
     > not       -> küçük açıklama satırı
*/

window.SONGS = [
  {
    title: "Örnek: Sabah Şarkısı",
    artist: "Deneme",
    capo: 2,
    bpm: 92,
    emoji: "☀️",
    tags: ["örnek", "türkçe"],
    notes: "Ritim: A - A Y - Y A Y",
    content: `
# Giriş
[G] [D] [Em] [C]  x2

# Kıta
[G]Sabah oldu [D]pencereden
[Em]Bir ışık düştü [C]odama
[G]Gitarımı al[D]dım elime
[C]Başladım yine [D]baştan

# Nakarat
[Em]Çal gi[C]tarım [G]çal
[D]Bu gece bizim
[Em]Çal gi[C]tarım [G]çal
> son seferde yavaşla
[D]Sabaha kadar
`
  },
  {
    title: "Örnek: Yağmur",
    artist: "Deneme",
    bpm: 70,
    emoji: "🌧️",
    tags: ["örnek", "slow"],
    content: `
# Kıta
Am                F
Yağmur yağar ince ince
C                G
Yollar uzar gece gece
Am             F
Bir çay demler otururum
Dm          E
Seni beklerim

# Nakarat
F          G        C     Am
Gel desen gelirim, dur desen dururum
Dm            E           Am
Bu yağmur da biter bir gün
`
  }
];
