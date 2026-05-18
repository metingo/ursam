// lib/stok-helper.ts
export const stokBakiyesiniHesapla = (hareketler: any[]) => {
  if (!hareketler) return 0;
  
  const bakiye = hareketler.reduce((acc, h) => {
    const miktar = parseFloat(h.miktar) || 0;
    
    // GİRİŞLER (+)
    const girisTurleri = ['SATIN_ALMA', 'URETIM_GIRIS', 'SAYIM_FAZLASI', 'IADE_GIRIS'];
    if (girisTurleri.includes(h.islem_turu)) {
      return acc + miktar;
    }
    
    // ÇIKIŞLAR (-)
    const cikisTurleri = ['SATIS', 'URETIM_CIKIS', 'ZAYI_CIKIS', 'SAYIM_NOKSANI', 'FIRE_CIKIS'];
    if (cikisTurleri.includes(h.islem_turu)) {
      return acc - miktar;
    }
    
    return acc;
  }, 0);

  // JavaScript ondalık hatasını (0.000000004 gibi) temizle
  return parseFloat(bakiye.toFixed(4));
};