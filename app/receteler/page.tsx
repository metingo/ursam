'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReceteLaboratuvari() {
  const [mamuller, setMamuller] = useState<any[]>([])
  const [hammaddeListesi, setHammaddeListesi] = useState<any[]>([])
  const [birimlerListesi, setBirimlerListesi] = useState<any[]>([])
  const [seciliMamulId, setSeciliMamulId] = useState('')
  const [mevcutRecete, setMevcutRecete] = useState<any[]>([])
  
  // Arama ve Panel Kontrolü
  const [mamulArama, setMamulArama] = useState('')
  const [malzemeArama, setMalzemeArama] = useState('')
  const [panelAcik, setPanelAcik] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  
  const [yeniMalzeme, setYeniMalzeme] = useState({ hammadde_id: '', miktar: 0, urun_adi: '' })
  const [duzenlemeId, setDuzenlemeId] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialData()
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setPanelAcik(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchInitialData = async () => {
    const [stokRes, birimRes, turRes] = await Promise.all([
      supabase.from('stok_kartlari').select('id, urun_adi, alis_fiyati, stok_tur_id'),
      supabase.from('birimler').select('*'),
      supabase.from('stok_turleri').select('*')
    ])
    setBirimlerListesi(birimRes.data || [])
    setHammaddeListesi(stokRes.data || [])
    const mamulTurIds = turRes.data?.filter(t => ['MAMUL', 'YARI MAMUL', 'YARI_MAMUL'].includes(t.tur_adi?.toUpperCase())).map(t => t.id) || []
    setMamuller(stokRes.data?.filter(s => mamulTurIds.includes(s.stok_tur_id)) || [])
  }

  const receteGetir = async (id: string) => {
    setSeciliMamulId(id)
    setDuzenlemeId(null)
    const { data } = await supabase.from('tarifler').select(`id, miktar, hammadde_id, birim, hammadde:stok_kartlari!hammadde_id (urun_adi, alis_fiyati)`).eq('mamul_id', id)
    setMevcutRecete(data || [])
  }

  const handleKaydet = async (e: React.FormEvent) => {
    e.preventDefault()
    if(!seciliMamulId || !yeniMalzeme.hammadde_id) return
    
    // Veritabanı görselindeki birim yapısına uyum (image_457466.png)
    const varsayilanBirim = "9462dff7-9b47-42d4-bd3c-a82c59833c3d" 

    if (duzenlemeId) {
      await supabase.from('tarifler').update({ hammadde_id: yeniMalzeme.hammadde_id, miktar: yeniMalzeme.miktar }).eq('id', duzenlemeId)
    } else {
      await supabase.from('tarifler').insert([{ mamul_id: seciliMamulId, hammadde_id: yeniMalzeme.hammadde_id, miktar: yeniMalzeme.miktar, birim: varsayilanBirim }])
    }
    setYeniMalzeme({ hammadde_id: '', miktar: 0, urun_adi: '' })
    setMalzemeArama('')
    receteGetir(seciliMamulId)
  }

  const handleSil = async (id: string) => {
    if (confirm("Bu malzemeyi reçeteden kaldırmak istediğinize emin misiniz?")) {
      await supabase.from('tarifler').delete().eq('id', id)
      receteGetir(seciliMamulId)
    }
  }

  const filtrelenmisMamuller = mamuller.filter(m => m.urun_adi.toLowerCase().includes(mamulArama.toLowerCase()))
  const filtrelenmisMalzemeler = hammaddeListesi.filter(h => h.urun_adi.toLowerCase().includes(malzemeArama.toLowerCase()))
  const toplamMaliyet = mevcutRecete.reduce((acc, curr) => acc + (curr.miktar * (curr.hammadde?.alis_fiyati || 0)), 0)

  return (
    <div className="p-8 bg-[#F3F4F6] min-h-screen text-slate-800">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-orange-600 tracking-tighter uppercase">Reçete Laboratuvarı</h1>
          <p className="text-slate-400 font-medium">Üretim formüllerini yönetin ve maliyetleri izleyin.</p>
        </header>

        <div className="grid grid-cols-12 gap-8">
          {/* SOL: ÜRETİLECEK ÜRÜNLER (image_450328.png) */}
          <div className="col-span-4 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 h-[75vh] flex flex-col">
            <h3 className="text-[11px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">🥐 Üretilecek Ürünler</h3>
            <input 
              type="text" placeholder="Ürün ara..." 
              className="w-full p-4 mb-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-orange-500 font-bold text-sm transition-all"
              value={mamulArama} onChange={(e) => setMamulArama(e.target.value)}
            />
            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
              {filtrelenmisMamuller.map(m => (
                <button key={m.id} onClick={() => receteGetir(m.id)}
                  className={`w-full text-left p-4 rounded-2xl font-bold transition-all ${seciliMamulId === m.id ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-50'}`}>
                  {m.urun_adi}
                </button>
              ))}
            </div>
          </div>

          {/* SAĞ: REÇETE DETAYLARI (image_4483a7.png) */}
          <div className="col-span-8 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200 flex flex-col min-h-[75vh]">
            {seciliMamulId ? (
              <>
                <form onSubmit={handleKaydet} className="grid grid-cols-12 gap-4 mb-10 items-end">
                  {/* MODAL GÖRÜNÜMLÜ MALZEME SEÇİMİ (image_46d069.png) */}
                  <div className="col-span-7 relative" ref={panelRef}>
                    <label className="text-[11px] font-black text-slate-400 block mb-2 uppercase tracking-widest">Hammadde Seçin</label>
                    <div 
                      onClick={() => setPanelAcik(true)}
                      className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-sm cursor-pointer flex justify-between items-center"
                    >
                      <span className={yeniMalzeme.urun_adi ? 'text-slate-800' : 'text-slate-400'}>
                        {yeniMalzeme.urun_adi || 'Bir malzeme arayın...'}
                      </span>
                      <span className="text-slate-300 text-xs">▼</span>
                    </div>

                    {panelAcik && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                        <input 
                          autoFocus type="text" placeholder="Malzeme ara..." 
                          className="w-full p-4 border-b border-slate-100 outline-none font-bold text-sm bg-orange-50/30"
                          value={malzemeArama} onChange={(e) => setMalzemeArama(e.target.value)}
                        />
                        <div className="max-h-[250px] overflow-y-auto">
                          {filtrelenmisMalzemeler.map(h => (
                            <div 
                              key={h.id} 
                              onClick={() => { setYeniMalzeme({...yeniMalzeme, hammadde_id: h.id, urun_adi: h.urun_adi}); setPanelAcik(false); }}
                              className="p-4 hover:bg-orange-500 hover:text-white cursor-pointer transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center group"
                            >
                              <span className="font-bold">{h.urun_adi}</span>
                              <span className="text-[10px] opacity-60 font-black uppercase group-hover:text-white">Seç</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-3">
                    <label className="text-[11px] font-black text-slate-400 block mb-2 uppercase tracking-widest">Miktar</label>
                    <input 
                      type="number" step="0.001" 
                      className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                      value={yeniMalzeme.miktar} onChange={e => setYeniMalzeme({...yeniMalzeme, miktar: parseFloat(e.target.value)})} 
                    />
                  </div>
                  <div className="col-span-2">
                    <button className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black hover:bg-orange-700 transition-all shadow-md active:scale-95 uppercase text-xs">
                      {duzenlemeId ? 'Kaydet' : 'Ekle'}
                    </button>
                  </div>
                </form>

                <div className="flex-1">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] border-b border-slate-100">
                        <th className="pb-4">Malzeme Adı</th>
                        <th className="pb-4 text-center">Miktar</th>
                        <th className="pb-4 text-right">Maliyet</th>
                        <th className="pb-4 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {mevcutRecete.map(r => (
                        <tr key={r.id} className="group hover:bg-slate-50/50 transition-all">
                          <td className="py-4 font-bold text-slate-700">{r.hammadde?.urun_adi}</td>
                          <td className="py-4 text-center font-black text-slate-500">
                            {r.miktar} <span className="text-[9px] text-slate-300 ml-1">{birimlerListesi.find(b => b.id === r.birim)?.birim_adi || 'Birim'}</span>
                          </td>
                          <td className="py-4 text-right font-black text-slate-900 tracking-tighter">
                            {(r.miktar * (r.hammadde?.alis_fiyati || 0)).toFixed(2)} ₺
                          </td>
                          <td className="py-4 text-right">
                            <button onClick={() => handleSil(r.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 p-2 font-bold text-xs transition-opacity uppercase tracking-tighter">Sil</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {mevcutRecete.length === 0 && (
                    <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">Henüz bir reçete oluşturulmamış.</div>
                  )}
                </div>

                {/* SİYAH MALİYET KARTI (image_4483a7.png) */}
                <div className="mt-10 flex justify-end">
                  <div className="bg-[#111827] text-white p-8 rounded-[2.5rem] shadow-2xl min-w-[320px]">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Toplam Hammadde Maliyeti</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black text-orange-500 tracking-tighter">{toplamMaliyet.toFixed(2)}</span>
                      <span className="text-2xl font-bold text-slate-400">₺ / Birim</span>
                    </div>
                    <p className="mt-4 text-[9px] text-slate-600 font-medium">* Maliyetler son alış fiyatları üzerinden hesaplanmıştır.</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-200">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-3xl">🥄</div>
                <p className="font-black uppercase tracking-[0.4em] text-xs text-slate-300">Lütfen Bir Ürün Seçin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}