'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function HizliSatis() {
  // State Tanımlamaları
  const [urunler, setUrunler] = useState<any[]>([])
  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [cariler, setCariler] = useState<any[]>([])
  const [sepet, setSepet] = useState<any[]>([])
  const [urunAra, setUrunAra] = useState('')
  const [cariAramaMetni, setCariAramaMetni] = useState('')
  const [seciliKategori, setSeciliKategori] = useState('HEPSİ')
  const [seciliCari, setSeciliCari] = useState<any>(null)
  const [isCariListOpen, setIsCariListOpen] = useState(false)
  const [islemYapiliyor, setIslemYapiliyor] = useState(false)
  const [isOdemeModalOpen, setIsOdemeModalOpen] = useState(false)
  const [odemeDagitim, setOdemeDagitim] = useState({ nakit: 0, kart: 0, havale: 0, acikHesap: 0 })

  useEffect(() => { fetchVeriler() }, [])

  const fetchVeriler = async () => {
    try {
      const { data: kData } = await supabase.from('kategoriler').select('*').order('ad')
      const { data: cData } = await supabase.from('cariler').select('*').order('firma_adi')
      const { data: sData } = await supabase.from('stok_kartlari').select('*').eq('satis_ekraninda_goster', true)
      setUrunler(sData || []); setKategoriler(kData || []); setCariler(cData || [])
    } catch (e) { console.error("Veri yükleme hatası:", e) }
  }

  // Filtrelemeler
  const filtrelenmisUrunler = urunler.filter(u => 
    (seciliKategori === 'HEPSİ' || u.kategori_id === seciliKategori) &&
    u.urun_adi.toLowerCase().includes(urunAra.toLowerCase())
  )
  const filtrelenmisCariler = cariler.filter(c => 
    c.firma_adi?.toLowerCase().includes(cariAramaMetni.toLowerCase()) || 
    c.yetkili_adi?.toLowerCase().includes(cariAramaMetni.toLowerCase())
  )

  const toplamTutar = sepet.reduce((sum, item) => sum + (item.fiyat * item.miktar), 0)

  const handleDinamikOdemeChange = (key: string, value: string) => {
    const girilenTutar = parseFloat(value) || 0
    const yeniDagitim = { ...odemeDagitim, [key]: girilenTutar }
    const digerleri = yeniDagitim.kart + yeniDagitim.havale + yeniDagitim.acikHesap
    setOdemeDagitim({ ...yeniDagitim, nakit: toplamTutar - digerleri })
  }

  const satisOnayla = async () => {
    if (sepet.length === 0 || islemYapiliyor) return
    if (odemeDagitim.acikHesap > 0 && !seciliCari) {
      alert("Açık hesap işlemi için müşteri seçmek zorunludur!"); return
    }

    setIslemYapiliyor(true)
    try {
      // 1. ADIM: Satış Ana Kaydı
      const { data: satis, error: sErr } = await supabase.from('satislar').insert([{
        toplam_tutar: toplamTutar,
        cari_id: seciliCari?.id || null
      }]).select().single()
      if (sErr) throw sErr

      // 2. ADIM: Stok Hareketleri ve Stok Kartı Güncelleme
      for (const item of sepet) {
        await supabase.from('stok_hareketleri').insert([{
          stok_id: item.id, islem_turu: 'SATIS_CIKIS', miktar: item.miktar
        }])
        const { data: urun } = await supabase.from('stok_kartlari').select('mevcut_stok').eq('id', item.id).single()
        await supabase.from('stok_kartlari').update({ mevcut_stok: (urun?.mevcut_stok || 0) - item.miktar }).eq('id', item.id)
      }

      // 3. ADIM: Hesap Hareketleri ve Kasa/Banka Bakiyeleri
      const odemeKanallari = [
        { id: '9df513ec-bd1f-4e2e-bab8-278b8ec80cc4', tutar: odemeDagitim.nakit, desc: 'Peşin Satış' },
        { id: '8352f481-8427-4b98-9ed6-b037d05f078b', tutar: odemeDagitim.kart, desc: 'Kredi Kartı' },
        { id: '6592986e-1bcd-47cc-9127-51a9b02c9a80', tutar: odemeDagitim.havale, desc: 'Havale/EFT' }
      ]

      for (const kanal of odemeKanallari) {
        if (kanal.tutar > 0) {
          await supabase.from('hesap_hareketleri').insert([{
            hesap_id: kanal.id, islem_turu: 'GIRIS', tutar: kanal.tutar, satis_id: satis.id, aciklama: kanal.desc
          }])
          const { data: h } = await supabase.from('hesaplar').select('guncel_bakiye').eq('id', kanal.id).single()
          await supabase.from('hesaplar').update({ guncel_bakiye: (h?.guncel_bakiye || 0) + kanal.tutar }).eq('id', kanal.id)
        }
      }

      // 4. ADIM: Cari Hareketleri (Ekstre) ve Cari Bakiye Güncelleme
      if (seciliCari) {
        const pesinOdenen = odemeDagitim.nakit + odemeDagitim.kart + odemeDagitim.havale
        
        // Cari Hareket Kaydı (Ekstre için tek satırda Borç ve Alacak işleniyor)
        await supabase.from('cari_hareketleri').insert([{
          cari_id: seciliCari.id,
          islem_turu: 'SATIS',
          borc: toplamTutar,
          alacak: pesinOdenen,
          aciklama: 'Hızlı Satış İşlemi',
          evrak_no: `SATIŞ-${satis.id.slice(0,5)}`,
          kayit_tarihi: new Date().toISOString().split('T')[0]
        }])

        // Cari Bakiyesi Güncelleme
        const { data: c } = await supabase.from('cariler').select('*').eq('id', seciliCari.id).single()
        await supabase.from('cariler').update({ 
          toplam_borc: (c?.toplam_borc || 0) + toplamTutar,
          toplam_alacak: (c?.toplam_alacak || 0) + pesinOdenen,
          guncel_bakiye: (c?.guncel_bakiye || 0) + odemeDagitim.acikHesap 
        }).eq('id', seciliCari.id)
      }

      alert("İşlem başarıyla tamamlandı!");
      setSepet([]); setIsOdemeModalOpen(false); setSeciliCari(null); fetchVeriler();
    } catch (e: any) { alert("Hata: " + e.message) } finally { setIslemYapiliyor(false) }
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden text-slate-800">
      {/* SOL: ÜRÜN SEÇİMİ */}
      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        <input type="text" placeholder="Ürün ara..." className="w-full p-4 mb-4 rounded-2xl shadow-sm outline-none font-bold" value={urunAra} onChange={(e) => setUrunAra(e.target.value)} />
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setSeciliKategori('HEPSİ')} className={`px-6 py-2 rounded-xl font-black text-[10px] ${seciliKategori === 'HEPSİ' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>TÜMÜ</button>
          {kategoriler.map(k => (
            <button key={k.id} onClick={() => setSeciliKategori(k.id)} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase ${seciliKategori === k.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>{k.ad}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pr-2">
          {filtrelenmisUrunler.map(urun => (
            <button key={urun.id} onClick={() => {
              const varolan = sepet.find(s => s.id === urun.id)
              setSepet(varolan ? sepet.map(s => s.id === urun.id ? { ...s, miktar: s.miktar + 1 } : s) : [...sepet, { id: urun.id, urun_adi: urun.urun_adi, fiyat: urun.satis_fiyati || 0, miktar: 1 }])
            }} className="bg-white p-6 rounded-[2rem] shadow-sm hover:ring-2 ring-indigo-500 text-center transition-all">
              <p className="font-black text-[10px] uppercase text-slate-500">{urun.urun_adi}</p>
              <p className="text-indigo-600 font-black text-xl">{urun.satis_fiyati} ₺</p>
              <p className="text-[9px] font-bold text-slate-400 mt-2">Stok: {urun.mevcut_stok || 0}</p>
            </button>
          ))}
        </div>
      </div>

      {/* SAĞ: SEPET */}
      <div className="w-[420px] bg-white shadow-2xl flex flex-col border-l">
        <div className="p-6 border-b flex justify-between"><h2 className="text-xl font-black uppercase">Sipariş Özeti</h2></div>
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {sepet.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
              <span className="font-bold text-xs uppercase">{item.urun_adi} x{item.miktar}</span>
              <span className="font-black text-sm">{item.fiyat * item.miktar} ₺</span>
            </div>
          ))}
        </div>
        <div className="p-8 bg-slate-900 rounded-t-[3rem] text-white">
          <div className="flex justify-between items-center mb-6"><span className="text-[10px] font-bold text-slate-400 uppercase">TOPLAM</span><span className="text-5xl font-black">{toplamTutar.toFixed(2)}₺</span></div>
          <button onClick={() => { setOdemeDagitim({nakit: toplamTutar, kart:0, havale:0, acikHesap:0}); setIsOdemeModalOpen(true); }} className="w-full bg-emerald-600 p-5 rounded-2xl font-black uppercase shadow-xl active:scale-95 transition-all">ÖDEMEYE GEÇ</button>
        </div>
      </div>

      {/* MODAL: ÖDEME & MÜŞTERİ SEÇİMİ */}
      {isOdemeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative">
            <h2 className="text-2xl font-black mb-8 uppercase text-center text-slate-800">Tahsilat Paneli</h2>
            
            {/* CARI AUTOCOMPLETE */}
            <div className="mb-8 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Müşteri Seçimi</label>
              <input type="text" placeholder={seciliCari ? seciliCari.firma_adi : "Müşteri ara..."} className={`w-full p-5 rounded-2xl border-2 outline-none font-bold ${odemeDagitim.acikHesap > 0 && !seciliCari ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-slate-50'}`} value={cariAramaMetni} onFocus={() => setIsCariListOpen(true)} onChange={(e) => { setCariAramaMetni(e.target.value); setIsCariListOpen(true); }} />
              {isCariListOpen && (
                <div className="absolute w-full mt-2 bg-white border rounded-2xl shadow-2xl z-[60] max-h-48 overflow-y-auto">
                  {filtrelenmisCariler.map(c => (
                    <div key={c.id} className="p-4 hover:bg-indigo-50 cursor-pointer border-b" onClick={() => { setSeciliCari(c); setCariAramaMetni(''); setIsCariListOpen(false); }}>
                      <p className="font-black text-xs uppercase">{c.firma_adi}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ÖDEME DAĞILIMI */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-indigo-50 p-5 rounded-2xl border-2 border-indigo-100"><span className="font-black text-[10px] text-indigo-400 uppercase">💵 NAKİT KALAN</span><span className="font-black text-2xl text-indigo-600">{odemeDagitim.nakit.toFixed(2)} ₺</span></div>
              {[{label:'💳 KREDİ KARTI', key:'kart'}, {label:'🏦 HAVALE', key:'havale'}, {label:'📄 AÇIK HESAP', key:'acikHesap'}].map(item => (
                <div key={item.key} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:ring-2 ring-indigo-500">
                  <span className="font-black text-[10px] text-slate-500 uppercase">{item.label}</span>
                  <input type="number" className="w-28 text-right font-black text-lg outline-none bg-transparent" value={odemeDagitim[item.key as keyof typeof odemeDagitim] || ''} onChange={(e) => handleDinamikOdemeChange(item.key, e.target.value)} onFocus={(e) => e.target.select()} />
                </div>
              ))}
            </div>

            <button onClick={satisOnayla} disabled={islemYapiliyor} className="w-full mt-10 bg-slate-900 text-white p-5 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">SATIŞI TAMAMLA</button>
            <button onClick={() => setIsOdemeModalOpen(false)} className="w-full mt-4 font-bold text-slate-400 text-center">Vazgeç</button>
          </div>
        </div>
      )}
    </div>
  )
}