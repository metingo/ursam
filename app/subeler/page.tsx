'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SubeYonetimi() {
  const [subeler, setSubeler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aramaMetni, setAramaMetni] = useState('')
  const [duzenlemeId, setDuzenlemeId] = useState<string | null>(null)
  
  const [form, setForm] = useState({ sube_adi: '', lokasyon: '', yetkili_kisi: '', telefon: '' })

  useEffect(() => { fetchSubeler() }, [])

  const fetchSubeler = async () => {
    setLoading(true)
    const { data } = await supabase.from('subeler').select('*').order('sube_adi')
    setSubeler(data || [])
    setLoading(false)
  }

  const handleKaydet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (duzenlemeId) {
      const { error } = await supabase.from('subeler').update(form).eq('id', duzenlemeId)
      if (error) alert("Güncelleme Hatası: " + error.message)
      setDuzenlemeId(null)
    } else {
      const { error } = await supabase.from('subeler').insert([form])
      if (error) alert("Kayıt Hatası: " + error.message)
    }
    setForm({ sube_adi: '', lokasyon: '', yetkili_kisi: '', telefon: '' })
    fetchSubeler()
  }

  const filtrelenmisSubeler = subeler.filter(s => s.sube_adi.toLowerCase().includes(aramaMetni.toLowerCase()))

  return (
    <div className="p-8 text-black bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-black mb-8 uppercase italic">Şube Yönetimi</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border h-fit">
          <h2 className="font-bold mb-4 uppercase text-xs text-slate-400">{duzenlemeId ? 'Düzenle' : 'Yeni Ekle'}</h2>
          <form onSubmit={handleKaydet} className="space-y-3">
            <input placeholder="Şube Adı" className="w-full p-3 border rounded-xl" value={form.sube_adi} onChange={e => setForm({...form, sube_adi: e.target.value})} required />
            <input placeholder="Lokasyon" className="w-full p-3 border rounded-xl" value={form.lokasyon} onChange={e => setForm({...form, lokasyon: e.target.value})} />
            <input placeholder="Yetkili" className="w-full p-3 border rounded-xl" value={form.yetkili_kisi} onChange={e => setForm({...form, yetkili_kisi: e.target.value})} />
            <input placeholder="Telefon" className="w-full p-3 border rounded-xl" value={form.telefon} onChange={e => setForm({...form, telefon: e.target.value})} />
            <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold">{duzenlemeId ? 'GÜNCELLE' : 'KAYDET'}</button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <input placeholder="Şube ara..." className="w-full p-4 border rounded-2xl bg-white" value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} />
          <div className="bg-white rounded-3xl border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold">
                <tr><th className="p-4">ŞUBE</th><th className="p-4">YETKİLİ</th><th className="p-4 text-right">İŞLEM</th></tr>
              </thead>
              <tbody>
                {filtrelenmisSubeler.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="p-4"><div className="font-bold">{s.sube_adi}</div><div className="text-xs text-slate-400">{s.lokasyon}</div></td>
                    <td className="p-4 text-sm">{s.yetkili_kisi}</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => { setDuzenlemeId(s.id); setForm(s); }} className="text-blue-600 font-bold">✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}