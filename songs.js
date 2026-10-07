/*
  ÖRNEK ŞARKI LİSTESİ (herkese açık)
  ===================================
  Kişisel şarkılar burada değil: ozel/sarkilar/*.txt -> node araclar/yayinla.mjs (şifreli).

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

window.SONGS = [];
