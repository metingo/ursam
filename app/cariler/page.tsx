'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function CariYonetimi() {
  const [cariler, setCariler] = useState<any[]>([])
  const [turler, setTurler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aramaMetni, setAramaMetni] = useState('')
  const [seciliTur, setSeciliTur] = useState('HEPSİ')

  const [isCariModalOpen, setIsCariModalOpen] = useState(false)
  const [isTurModalOpen, setIsTurModalOpen] = useState(false)
  
  const [duzenlemeId, setDuzenlemeId] = useState<string | null>(null)
  const [yeniTur, setYeniTur] = useState('')
  const [form, setForm] = useState({
    firma_adi: '', yetkili_adi: '', telefon: '', vergi_no: '', 
    vergi_dairesi: '', iban: '', cari_tur_id: ''
  })

  useEffect(() => { fetchVeriler() }, [])

  const fetchVeriler = async () => {
    setLoading(true)
    const { data: cData } = await supabase.from('cariler').select('*, cari_turleri(tur_adi)').order('firma_adi')
    const { data: tData } = await supabase.from('cari_turleri').select('*').order('tur_adi')
    setCariler(cData || [])
    setTurler(tData || [])
    setLoading(false)
  }

  const handleCariKaydet = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, cari_tur_id: form.cari_tur_id || null }

    if (duzenlemeId) {
      await supabase.from('cariler').update(payload).eq('id', duzenlemeId)
      setDuzenlemeId(null)
    } else {
      await supabase.from('cariler').insert([payload])
    }
    
    setForm({ firma_adi: '', yetkili_adi: '', telefon: '', vergi_no: '', vergi_dairesi: '', iban: '', cari_tur_id: '' })
    setIsCariModalOpen(false)
    fetchVeriler()
  }

  // --- SİLME FONKSİYONU ---
  const cariSil = async (id: string, firmaAdi: string) => {
    const onay = confirm(`"${firmaAdi.toUpperCase()}" kaydını ve bu cariye ait tüm hareketleri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`);
    
    if (onay) {
      // Önce varsa hareketleri siliyoruz (Foreign Key kısıtlaması varsa hata almamak için)
      await supabase.from('cari_hareketleri').delete().eq('cari_id', id)
      // Sonra cariyi siliyoruz
      const { error } = await supabase.from('cariler').delete().eq('id', id)
      
      if (error) {
        alert("Silme işlemi sırasında bir hata oluştu: " + error.message)
      } else {
        fetchVeriler()
      }
    }
  }

  const duzenlemeBaslat = (cari: any) => {
    setDuzenlemeId(cari.id)
    setForm({
      firma_adi: cari.firma_adi || '',
      yetkili_adi: cari.yetkili_adi || '',
      telefon: cari.telefon || '',
      vergi_no: cari.vergi_no || '',
      vergi_dairesi: cari.vergi_dairesi || '',
      iban: cari.iban || '',
      cari_tur_id: cari.cari_tur_id || ''
    })
    setIsCariModalOpen(true)
  }

  const turIslem = async (islem: 'EKLE' | 'SIL', id?: string) => {
    if (islem === 'EKLE' && yeniTur) {
      await supabase.from('cari_turleri').insert([{ tur_adi: yeniTur }])
      setYeniTur('')
    } else if (islem === 'SIL' && id) {
      await supabase.from('cari_turleri').delete().eq('id', id)
    }
    fetchVeriler()
  }

  const filtrelenmisCariler = cariler.filter(c => {
    const metinMatch = c.firma_adi.toLowerCase().includes(aramaMetni.toLowerCase())
    const turMatch = seciliTur === 'HEPSİ' || c.cari_turleri?.tur_adi === seciliTur
    return metinMatch && turMatch
  })

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ÜST BAR */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">Cari Portalı</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsTurModalOpen(true)} className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200">Kategoriler</button>
            <button onClick={() => { setDuzenlemeId(null); setIsCariModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-600 transition-all">+ Yeni Cari</button>
          </div>
        </div>

        {/* LİSTE */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border flex items-center gap-4">
            <input placeholder="Firma ara..." className="flex-1 bg-transparent outline-none font-bold px-4" value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} />
            <select className="bg-slate-50 p-2 rounded-lg font-black text-[10px] uppercase border-none outline-none" value={seciliTur} onChange={e => setSeciliTur(e.target.value)}>
              <option value="HEPSİ">TÜMÜ</option>
              {turler.map(t => <option key={t.id} value={t.tur_adi}>{t.tur_adi}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b text-[10px] uppercase font-black text-slate-400">
                <tr>
                  <th className="p-6">Cari Bilgisi</th>
                  <th className="p-6 text-right">Bakiye</th>
                  <th className="p-6 text-right px-10">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtrelenmisCariler.map(c => {
                  const bakiye = (Number(c.toplam_alacak) || 0) - (Number(c.toplam_borc) || 0)
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition group">
                      <td className="p-6">
                        <Link href={`/cariler/${c.id}`}>
                          <div className="font-black text-lg text-slate-800 uppercase group-hover:text-indigo-600 transition-colors">{c.firma_adi}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.cari_turleri?.tur_adi} • {c.yetkili_adi}</div>
                        </Link>
                      </td>
                      <td className="p-6 text-right font-mono">
                        <div className={`font-black text-xl ${bakiye > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{Math.abs(bakiye).toLocaleString('tr-TR')} ₺</div>
                        <div className="text-[9px] font-black opacity-30 uppercase">{bakiye > 0 ? 'BORÇLUYUZ' : 'ALACAKLIYIZ'}</div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => duzenlemeBaslat(c)} className="p-3 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all text-slate-400">✏️</button>
                            <button onClick={() => cariSil(c.id, c.firma_adi)} className="p-3 bg-slate-50 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all text-slate-400">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CARİ KAYIT MODAL */}
      {isCariModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-10 rounded-[3.5rem] w-full max-w-md shadow-2xl scale-in-center">
            <h2 className="text-3xl font-black mb-8 uppercase tracking-tighter">{duzenlemeId ? 'Düzenle' : 'Yeni Cari'}</h2>
            <form onSubmit={handleCariKaydet} className="space-y-4">
              <input placeholder="Firma Adı" className="w-full p-4 rounded-2xl bg-slate-50 font-bold border-none outline-none ring-1 ring-slate-100 focus:ring-indigo-500 transition-all" value={form.firma_adi} onChange={e => setForm({...form, firma_adi: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Yetkili" className="p-4 rounded-2xl bg-slate-50 font-bold text-xs border-none outline-none ring-1 ring-slate-100 focus:ring-indigo-500 transition-all" value={form.yetkili_adi} onChange={e => setForm({...form, yetkili_adi: e.target.value})} />
                <select className="p-4 rounded-2xl bg-slate-50 font-bold text-xs border-none outline-none ring-1 ring-slate-100 focus:ring-indigo-500 transition-all" value={form.cari_tur_id} onChange={e => setForm({...form, cari_tur_id: e.target.value})} required>
                  <option value="">Tür Seç...</option>
                  {turler.map(t => <option key={t.id} value={t.id}>{t.tur_adi}</option>)}
                </select>
              </div>
              <input placeholder="Telefon" className="w-full p-4 rounded-2xl bg-slate-50 font-bold border-none outline-none ring-1 ring-slate-100 focus:ring-indigo-500 transition-all" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} />
              <input placeholder="IBAN" className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-xs border-none outline-none ring-1 ring-slate-100 focus:ring-indigo-500 transition-all" value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} />
              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase shadow-lg hover:bg-indigo-600 transition-all mt-4">Kaydet</button>
              <button type="button" onClick={() => setIsCariModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">Vazgeç</button>
            </form>
          </div>
        </div>
      )}

      {/* KATEGORİ MODAL */}
      {isTurModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-10 rounded-[3.5rem] w-full max-w-md shadow-2xl scale-in-center">
            <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter text-center">Kategoriler</h2>
            <div className="flex gap-2 mb-6">
              <input placeholder="Yeni Tür..." className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none ring-1 ring-slate-100 focus:ring-indigo-500 transition-all" value={yeniTur} onChange={e => setYeniTur(e.target.value)} />
              <button onClick={() => turIslem('EKLE')} className="bg-slate-900 text-white px-6 rounded-2xl font-bold hover:bg-indigo-600 transition-all">+</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-auto pr-2 custom-scrollbar">
              {turler.map(t => (
                <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-all">
                  <span className="font-black text-[10px] uppercase tracking-wider text-slate-600">{t.tur_adi}</span>
                  <button onClick={() => turIslem('SIL', t.id)} className="text-rose-400 hover:text-rose-600 font-bold text-xs p-1">SİL</button>
                </div>
              ))}
            </div>
            <button onClick={() => setIsTurModalOpen(false)} className="w-full mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kapat</button>
          </div>
        </div>
      )}
    </div>
  )
}