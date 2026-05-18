'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useSube } from '@/context/SubeContext'

export default function AlisFaturasi() {
  const { aktifSubeId } = useSube()
  const [loading, setLoading] = useState(false)
  
  const [cariler, setCariler] = useState<any[]>([])
  const [stoklar, setStoklar] = useState<any[]>([])
  const [hesaplar, setHesaplar] = useState<any[]>([])

  const [cariAramaMetni, setCariAramaMetni] = useState('')
  const [satirAramaMetni, setSatirAramaMetni] = useState<string[]>(['']) 
  const [cariDropdownAcik, setCariDropdownAcik] = useState(false)
  const [aktifSatirIdx, setAktifSatirIdx] = useState<number | null>(null)

  const [ustBilgi, setUstBilgi] = useState({
    cari_id: '',
    evrak_no: '',
    tarih: new Date().toISOString().split('T')[0],
    aciklama: '',
    odeme_turu: 'VERESIYE',
    hesap_id: ''
  })

  const [satirlar, setSatirlar] = useState<any[]>([
    { stok_id: '', urun_adi: '', miktar: 1, birim_fiyat: 0, kdv_oran: 20, iskonto_oran: 0 }
  ])

  useEffect(() => {
    const fetchData = async () => {
      const { data: c } = await supabase.from('cariler').select('*').order('firma_adi')
      const { data: s } = await supabase.from('stok_kartlari').select('*').order('urun_adi')
      setCariler(c || []); setStoklar(s || [])
      
      if (aktifSubeId) {
        const { data: h } = await supabase.from('hesaplar').select('*').eq('sube_id', aktifSubeId)
        setHesaplar(h || [])
      }
    }
    fetchData()
  }, [aktifSubeId])

  // TÜM HESAPLAMA DETAYLARI BURADA (Eksiksiz)
  const hesaplamalar = useMemo(() => {
    let brutToplam = 0
    let iskontoToplam = 0
    let kdvToplam = 0

    satirlar.forEach(s => {
      const miktar = Number(s.miktar) || 0
      const fiyat = Number(s.birim_fiyat) || 0
      const iskOran = Number(s.iskonto_oran) || 0
      const kdvOran = Number(s.kdv_oran) || 0

      const satirBrut = miktar * fiyat
      const satirIskonto = satirBrut * (iskOran / 100)
      const satirMatrah = satirBrut - satirIskonto
      const satirKdv = satirMatrah * (kdvOran / 100)
      
      brutToplam += satirBrut
      iskontoToplam += satirIskonto
      kdvToplam += satirKdv
    })

    return { 
      brutToplam, 
      iskontoToplam, 
      matrah: brutToplam - iskontoToplam, 
      kdvToplam, 
      genelToplam: (brutToplam - iskontoToplam) + kdvToplam 
    }
  }, [satirlar])

  const faturayiKaydet = async () => {
    if (!aktifSubeId) return alert("HATA: Şube seçili değil! Lütfen sol menüden bir şube seçin.")
    if (!ustBilgi.cari_id) return alert("HATA: Lütfen listeden bir CARİ seçin.")

    setLoading(true)
    try {
      // 1. Cari Hareket
      const { error: cErr } = await supabase.from('cari_hareketleri').insert([{
        cari_id: ustBilgi.cari_id,
        sube_id: aktifSubeId,
        islem_turu: 'ALIS_FATURASI',
        alacak: hesaplamalar.genelToplam,
        evrak_no: ustBilgi.evrak_no,
        kayit_tarihi: ustBilgi.tarih
      }])
      if (cErr) throw cErr

      // 2. Stok Hareketleri
      for (const s of satirlar) {
        if (!s.stok_id) continue
        const { error: sErr } = await supabase.from('stok_hareketleri').insert([{
          stok_id: s.stok_id,
          sube_id: aktifSubeId,
          islem_turu: 'ALIS',
          miktar: Number(s.miktar),
          birim_fiyat: Number(s.birim_fiyat),
          evrak_no: ustBilgi.evrak_no
        }])
        if (sErr) throw sErr

        // Stok Miktar Güncelleme
        const { data: kart } = await supabase.from('stok_kartlari').select('mevcut_stok').eq('id', s.stok_id).single()
        await supabase.from('stok_kartlari').update({
          mevcut_stok: (kart?.mevcut_stok || 0) + Number(s.miktar),
          alis_fiyati: Number(s.birim_fiyat)
        }).eq('id', s.stok_id)
      }

      // 3. Ödeme Varsa
      if (ustBilgi.odeme_turu === 'PESIN' && ustBilgi.hesap_id) {
        await supabase.from('hesap_hareketleri').insert([{
          hesap_id: ustBilgi.hesap_id, sube_id: aktifSubeId, islem_turu: 'CIKIS',
          tutar: hesaplamalar.genelToplam, aciklama: `Fatura Ödemesi: ${ustBilgi.evrak_no}`
        }])
        await supabase.from('cari_hareketleri').insert([{
          cari_id: ustBilgi.cari_id, sube_id: aktifSubeId, islem_turu: 'ODEME',
          borc: hesaplamalar.genelToplam, evrak_no: ustBilgi.evrak_no
        }])
      }

      alert("Fatura Başarıyla Kaydedildi!")
      window.location.reload()
    } catch (e: any) {
      alert("Kritik Hata: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-32">
      {/* ÜST PANEL: ŞUBE DURUMU */}
      <div className={`p-3 rounded-xl flex justify-between items-center ${aktifSubeId ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
        <span className="text-xs font-black uppercase tracking-widest">
           {aktifSubeId ? `✅ AKTİF ŞUBE BAĞLI: ${aktifSubeId}` : '❌ ŞUBE SEÇİLMEDİ! SOL MENÜDEN SEÇİN'}
        </span>
      </div>

      {/* ÜST BİLGİLER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border shadow-sm relative">
          <label className="text-[10px] font-black text-blue-600 uppercase">Tedarikçi Seçimi</label>
          <input 
            className="w-full mt-1 p-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-blue-500"
            placeholder="Cari ara..."
            value={cariAramaMetni}
            onFocus={() => setCariDropdownAcik(true)}
            onChange={(e) => { setCariAramaMetni(e.target.value); setCariDropdownAcik(true); }}
          />
          {cariDropdownAcik && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-blue-50 shadow-2xl rounded-2xl max-h-60 overflow-y-auto z-[9999]">
              {cariler.filter(c => c.firma_adi.toLowerCase().includes(cariAramaMetni.toLowerCase())).map(c => (
                <div key={c.id} className="p-4 hover:bg-blue-50 cursor-pointer border-b font-bold text-gray-700"
                  onClick={() => { setUstBilgi({...ustBilgi, cari_id: c.id}); setCariAramaMetni(c.firma_adi); setCariDropdownAcik(false); }}>
                  {c.firma_adi}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <label className="text-[10px] font-black text-gray-400 uppercase">Evrak No & Tarih</label>
          <div className="flex gap-2 mt-1">
            <input className="w-full p-3 bg-slate-50 rounded-xl font-bold border" placeholder="No" value={ustBilgi.evrak_no} onChange={e => setUstBilgi({...ustBilgi, evrak_no: e.target.value})} />
            <input type="date" className="w-full p-3 bg-slate-50 rounded-xl font-bold border" value={ustBilgi.tarih} onChange={e => setUstBilgi({...ustBilgi, tarih: e.target.value})} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <label className="text-[10px] font-black text-gray-400 uppercase">Ödeme Türü</label>
          <div className="flex gap-2 mt-1">
            <select className="w-full p-3 bg-slate-50 rounded-xl font-bold border" value={ustBilgi.odeme_turu} onChange={e => setUstBilgi({...ustBilgi, odeme_turu: e.target.value})}>
              <option value="VERESIYE">VERESİYE (AÇIK)</option>
              <option value="PESIN">PEŞİN ÖDEME</option>
            </select>
            {ustBilgi.odeme_turu === 'PESIN' && (
              <select className="w-full p-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold border" value={ustBilgi.hesap_id} onChange={e => setUstBilgi({...ustBilgi, hesap_id: e.target.value})}>
                <option value="">Kasa Seç...</option>
                {hesaplar.map(h => <option key={h.id} value={h.id}>{h.hesap_adi}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ÜRÜN TABLOSU */}
      <div className="bg-white rounded-3xl border shadow-sm overflow-visible">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
            <tr>
              <th className="p-4 text-left rounded-tl-3xl">Ürün / Stok</th>
              <th className="p-4 w-24 text-center">Miktar</th>
              <th className="p-4 w-32 text-center">B. Fiyat</th>
              <th className="p-4 w-20 text-center">KDV%</th>
              <th className="p-4 w-20 text-center">İSK%</th>
              <th className="p-4 text-right pr-8 rounded-tr-3xl">Satır Toplamı</th>
              <th className="p-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y overflow-visible">
            {satirlar.map((s, idx) => (
              <tr key={idx} className="overflow-visible">
                <td className="p-2 relative overflow-visible">
                  <input 
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold border-2 border-transparent focus:border-blue-500 outline-none"
                    placeholder="Ürün seç..."
                    value={satirAramaMetni[idx] || ''}
                    onFocus={() => setAktifSatirIdx(idx)}
                    onChange={(e) => {
                        const n = [...satirAramaMetni]; n[idx] = e.target.value; setSatirAramaMetni(n);
                        setAktifSatirIdx(idx);
                    }}
                  />
                  {aktifSatirIdx === idx && (
                    <div className="absolute left-0 w-[450px] mt-1 bg-white border-2 border-blue-50 shadow-2xl rounded-2xl max-h-52 overflow-y-auto z-[9999]">
                      {stoklar.filter(i => i.urun_adi.toLowerCase().includes(satirAramaMetni[idx]?.toLowerCase() || '')).map(item => (
                        <div key={item.id} className="p-4 hover:bg-blue-50 cursor-pointer border-b flex justify-between items-center"
                          onClick={() => {
                            const ns = [...satirlar];
                            ns[idx] = { ...ns[idx], stok_id: item.id, urun_adi: item.urun_adi, birim_fiyat: item.alis_fiyati || 0 };
                            setSatirlar(ns);
                            const nt = [...satirAramaMetni]; nt[idx] = item.urun_adi; setSatirAramaMetni(nt);
                            setAktifSatirIdx(null);
                          }}>
                          <span className="font-bold text-gray-800">{item.urun_adi}</span>
                          <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{item.alis_fiyati} ₺</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-2"><input type="number" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-center border" value={s.miktar} onChange={e => {const n = [...satirlar]; n[idx].miktar = e.target.value; setSatirlar(n)}} /></td>
                <td className="p-2"><input type="number" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-center border" value={s.birim_fiyat} onChange={e => {const n = [...satirlar]; n[idx].birim_fiyat = e.target.value; setSatirlar(n)}} /></td>
                <td className="p-2"><input type="number" className="w-full p-3 bg-blue-50 text-blue-700 rounded-xl font-bold text-center border-blue-100" value={s.kdv_oran} onChange={e => {const n = [...satirlar]; n[idx].kdv_oran = e.target.value; setSatirlar(n)}} /></td>
                <td className="p-2"><input type="number" className="w-full p-3 bg-rose-50 text-rose-700 rounded-xl font-bold text-center border-rose-100" value={s.iskonto_oran} onChange={e => {const n = [...satirlar]; n[idx].iskonto_oran = e.target.value; setSatirlar(n)}} /></td>
                <td className="p-2 text-right pr-8 font-black text-slate-800">
                  {((Number(s.miktar) * Number(s.birim_fiyat) * (1 - (Number(s.iskonto_oran)||0)/100)) * (1 + (Number(s.kdv_oran)||0)/100)).toFixed(2)} ₺
                </td>
                <td className="p-2"><button onClick={() => setSatirlar(satirlar.filter((_, i) => i !== idx))} className="text-red-400 font-bold px-2 hover:bg-red-50 rounded-full w-8 h-8">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => { setSatirlar([...satirlar, {stok_id: '', urun_adi: '', miktar: 1, birim_fiyat: 0, kdv_oran: 20, iskonto_oran: 0}]); setSatirAramaMetni([...satirAramaMetni, '']) }} className="w-full p-4 text-[10px] font-black text-blue-600 bg-slate-50 hover:bg-blue-100 transition-all">+ YENİ ÜRÜN SATIRI EKLE</button>
      </div>

      {/* ALT TOPLAM PANELİ (TÜM ÖZELLİKLER GERİ GELDİ) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="bg-white p-6 rounded-3xl border shadow-sm h-full">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2">Fatura Notları</label>
            <textarea className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-sm border-none outline-none focus:ring-2 ring-blue-50" rows={6} placeholder="Bu faturaya ait özel notları buraya yazabilirsiniz..." value={ustBilgi.aciklama} onChange={e => setUstBilgi({...ustBilgi, aciklama: e.target.value})}></textarea>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl space-y-4 border-4 border-slate-800">
            {/* Detaylı Hesaplama Bilgileri */}
            <div className="flex justify-between text-slate-500 font-black text-[11px] uppercase tracking-tighter">
                <span>Brüt Toplam</span>
                <span>{hesaplamalar.brutToplam.toFixed(2)} ₺</span>
            </div>
            <div className="flex justify-between text-rose-500 font-black text-[11px] uppercase tracking-tighter">
                <span>Toplam İskonto (-)</span>
                <span>{hesaplamalar.iskontoToplam.toFixed(2)} ₺</span>
            </div>
            <div className="flex justify-between text-slate-300 font-black text-[11px] uppercase tracking-tighter border-t border-slate-800 pt-2">
                <span>KDV Matrahı</span>
                <span>{hesaplamalar.matrah.toFixed(2)} ₺</span>
            </div>
            <div className="flex justify-between text-blue-400 font-black text-[11px] uppercase tracking-tighter">
                <span>KDV Toplamı (+)</span>
                <span>{hesaplamalar.kdvToplam.toFixed(2)} ₺</span>
            </div>
            
            <div className="h-px bg-slate-800 my-4"></div>
            
            <div className="flex justify-between items-center font-black">
                <span className="text-xs uppercase text-slate-400 italic">Net Ödenecek Toplam</span>
                <span className="text-4xl text-emerald-400 tracking-tighter">{hesaplamalar.genelToplam.toFixed(2)} ₺</span>
            </div>

            <button 
                onClick={faturayiKaydet} disabled={loading}
                className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 py-6 rounded-3xl font-black text-xl transition-all shadow-xl shadow-emerald-500/10 active:scale-95"
            >
                {loading ? 'SİSTEME İŞLENİYOR...' : 'FATURAYI KAYDET'}
            </button>
        </div>
      </div>
    </div>
  )
}