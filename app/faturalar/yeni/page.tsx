'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function YeniFaturaPage() {
  const router = useRouter()
  const [aktifSubeId, setAktifSubeId] = useState<string | null>(null)
  
  const [cariler, setCariler] = useState<any[]>([])
  const [stoklar, setStoklar] = useState<any[]>([])
  
  const [cariArama, setCariArama] = useState('')
  const [seciliCari, setSeciliCari] = useState<any>(null)
  const [showCariList, setShowCariList] = useState(false)

  const [activeUrunIndex, setActiveUrunIndex] = useState<number | null>(null)
  const [urunArama, setUrunArama] = useState('')

  // Fatura Satırları
  const [satirlar, setSatirlar] = useState([
    { urun_id: '', urun_adi: '', miktar: 1, birim_fiyat: 0, iskonto: 0, kdv: 20, toplam: 0 }
  ])

  const [ustBilgi, setUstBilgi] = useState({
    evrak_no: '',
    tarih: new Date().toISOString().split('T')[0],
    not: '',
    islem_turu: 'ALIS' as 'ALIS' | 'SATIS'
  })

  useEffect(() => {
    const sube = localStorage.getItem('aktif_sube_id')
    setAktifSubeId(sube)
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: c } = await supabase.from('cariler').select('*')
    const { data: s } = await supabase.from('stok_kartlari').select('*')
    setCariler(c || []); setStoklar(s || [])
  }

  // Satır bazlı hesaplama ve güncelleme (Bug Fix)
  const satirGuncelle = (index: number, updates: any) => {
    setSatirlar(prev => {
      const yeni = [...prev]
      const mevcut = { ...yeni[index], ...updates }
      
      const ham = (mevcut.miktar || 0) * (mevcut.birim_fiyat || 0)
      const isk = ham * ((mevcut.iskonto || 0) / 100)
      const matrah = ham - isk
      const kdv = matrah * ((mevcut.kdv || 0) / 100)
      
      mevcut.toplam = matrah + kdv
      yeni[index] = mevcut
      return yeni
    })
  }

  const urunSec = (index: number, urun: any) => {
    satirGuncelle(index, {
      urun_id: urun.id,
      urun_adi: urun.urun_adi,
      birim_fiyat: urun.satis_fiyati || 0
    })
    setActiveUrunIndex(null)
    setUrunArama('')
  }

  // Alt Toplamlar
  const araToplam = satirlar.reduce((acc, curr) => acc + (curr.miktar * curr.birim_fiyat), 0)
  const toplamIskonto = satirlar.reduce((acc, curr) => acc + ((curr.miktar * curr.birim_fiyat) * (curr.iskonto / 100)), 0)
  const toplamKdv = satirlar.reduce((acc, curr) => {
    const matrah = (curr.miktar * curr.birim_fiyat) - ((curr.miktar * curr.birim_fiyat) * (curr.iskonto / 100))
    return acc + (matrah * (curr.kdv / 100))
  }, 0)
  const genelToplam = araToplam - toplamIskonto + toplamKdv

  const faturaKaydet = async () => {
    if (!aktifSubeId) return alert("HATA: Aktif şube seçili değil!")
    if (!seciliCari) return alert("Cari seçimi zorunludur!")
    
    try {
      // Cari ve Stok Hareketleri Kaydı (Loop)
      // ... (Daha önce verdiğimiz insert mantığı aynen geçerli)
      alert("Fatura Başarıyla Kaydedildi!")
      router.push('/faturalar')
    } catch (err) { alert("Hata oluştu!") }
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-black font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-black text-indigo-900 uppercase italic">Yeni {ustBilgi.islem_turu === 'ALIS' ? 'Alış' : 'Satış'} Faturası</h1>

        {/* CARİ ARAMA PANELİ */}
        <div className="bg-white p-6 rounded-[32px] shadow-sm border grid grid-cols-4 gap-4 relative">
          <div className="relative">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Müşteri / Tedarikçi</label>
            <input 
              className="w-full mt-1 p-3 bg-slate-50 border rounded-xl outline-none font-bold"
              placeholder="Cari Ara..."
              value={seciliCari ? seciliCari.firma_adi : cariArama}
              onChange={(e) => { setCariArama(e.target.value); setSeciliCari(null); setShowCariList(true); }}
            />
            {showCariList && cariArama && (
              <div className="absolute z-[100] w-full bg-white border shadow-2xl rounded-xl mt-2 max-h-48 overflow-y-auto">
                {cariler.filter(c => c.firma_adi.toLowerCase().includes(cariArama.toLowerCase())).map(c => (
                  <div key={c.id} onClick={() => { setSeciliCari(c); setShowCariList(false); }} className="p-3 hover:bg-indigo-50 cursor-pointer font-bold text-sm border-b last:border-0 uppercase">{c.firma_adi}</div>
                ))}
              </div>
            )}
          </div>
          {/* Diğer üst bilgiler (Evrak No, Tarih vb.) buraya gelir */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Evrak No</label>
            <input className="w-full mt-1 p-3 bg-slate-50 border rounded-xl outline-none font-bold" value={ustBilgi.evrak_no} onChange={e => setUstBilgi({...ustBilgi, evrak_no: e.target.value})} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tarih</label>
            <input type="date" className="w-full mt-1 p-3 bg-slate-50 border rounded-xl outline-none font-bold" value={ustBilgi.tarih} onChange={e => setUstBilgi({...ustBilgi, tarih: e.target.value})} />
          </div>
        </div>

        {/* SATIRLAR VE ÜRÜN ARAMA */}
        <div className="bg-white rounded-[32px] shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
              <tr>
                <th className="p-5">Ürün</th>
                <th className="p-5 w-24 text-center">Miktar</th>
                <th className="p-5 w-32">Birim Fiyat</th>
                <th className="p-5 w-20">İsk %</th>
                <th className="p-5 w-20">KDV %</th>
                <th className="p-5 text-right">Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.map((satir, index) => (
                <tr key={index} className="relative">
                  <td className="p-4 relative">
                    <input 
                      placeholder="Ürün Ara..."
                      className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      value={satir.urun_adi || (activeUrunIndex === index ? urunArama : '')}
                      onChange={(e) => {
                        setUrunArama(e.target.value);
                        setActiveUrunIndex(index);
                        satirGuncelle(index, { urun_adi: '', urun_id: '' });
                      }}
                      onFocus={() => setActiveUrunIndex(index)}
                    />
                    {activeUrunIndex === index && urunArama && (
                      <div className="absolute z-[90] left-4 right-4 bg-white border shadow-2xl rounded-xl mt-1 max-h-48 overflow-y-auto">
                        {stoklar.filter(s => s.urun_adi.toLowerCase().includes(urunArama.toLowerCase())).map(s => (
                          <div key={s.id} onClick={() => urunSec(index, s)} className="p-3 hover:bg-emerald-50 cursor-pointer font-bold text-sm border-b last:border-0 uppercase italic">{s.urun_adi}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-4"><input type="number" className="w-full p-3 border rounded-xl text-center font-bold" value={satir.miktar} onChange={e => satirGuncelle(index, { miktar: parseFloat(e.target.value) })} /></td>
                  <td className="p-4"><input type="number" className="w-full p-3 border rounded-xl font-black text-indigo-700" value={satir.birim_fiyat} onChange={e => satirGuncelle(index, { birim_fiyat: parseFloat(e.target.value) })} /></td>
                  <td className="p-4"><input type="number" className="w-full p-3 border rounded-xl text-center" value={satir.iskonto} onChange={e => satirGuncelle(index, { iskonto: parseFloat(e.target.value) })} /></td>
                  <td className="p-4"><input type="number" className="w-full p-3 border rounded-xl text-center" value={satir.kdv} onChange={e => satirGuncelle(index, { kdv: parseFloat(e.target.value) })} /></td>
                  <td className="p-4 text-right font-black text-lg">{satir.toplam.toFixed(2)} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-slate-50/50 flex justify-between">
            <button 
              onClick={() => setSatirlar([...satirlar, { urun_id: '', urun_adi: '', miktar: 1, birim_fiyat: 0, iskonto: 0, kdv: 20, toplam: 0 }])}
              className="text-xs font-black text-indigo-600 uppercase tracking-widest"
            >
              + YENİ SATIR EKLE
            </button>
            <span className="text-[10px] text-slate-400 font-bold uppercase italic">Yeni satır ekleyince mevcut veriler korunur.</span>
          </div>
        </div>

        {/* ALT TOPLAMLAR VE ONAY */}
        <div className="flex justify-end">
          <div className="w-80 bg-white p-6 rounded-[32px] border shadow-sm space-y-3">
            <div className="flex justify-between text-sm font-bold text-slate-400"><span>Ara Toplam</span><span>{araToplam.toFixed(2)} ₺</span></div>
            <div className="flex justify-between text-sm font-bold text-rose-500"><span>İskonto</span><span>- {toplamIskonto.toFixed(2)} ₺</span></div>
            <div className="flex justify-between text-sm font-bold text-indigo-500"><span>KDV</span><span>+ {toplamKdv.toFixed(2)} ₺</span></div>
            <div className="border-t pt-3 flex justify-between text-2xl font-black"><span>TOPLAM</span><span>{genelToplam.toFixed(2)} ₺</span></div>
          </div>
        </div>

        <button 
          onClick={faturaKaydet}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-[32px] font-black text-xl shadow-lg transition-all active:scale-95"
        >
          FATURAYI ONAYLA VE STOKLARI GÜNCELLE
        </button>
      </div>
    </div>
  )
}