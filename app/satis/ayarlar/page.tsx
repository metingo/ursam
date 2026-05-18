'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SatisAyarlari() {
  const [stoklar, setStoklar] = useState<any[]>([])
  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [yeniKategori, setYeniKategori] = useState('')

  useEffect(() => { fetchVeriler() }, [])

  const fetchVeriler = async () => {
    const { data: sData } = await supabase.from('stok_kartlari').select('*, kategoriler(ad)').order('urun_adi')
    const { data: kData } = await supabase.from('kategoriler').select('*').order('sira_no')
    setStoklar(sData || [])
    setKategoriler(kData || [])
  }

  const kategoriEkle = async () => {
    if (!yeniKategori) return
    await supabase.from('kategoriler').insert([{ ad: yeniKategori }])
    setYeniKategori('')
    fetchVeriler()
  }

  const urunGuncelle = async (id: string, alan: string, deger: any) => {
    const { error } = await supabase.from('stok_kartlari').update({ [alan]: deger }).eq('id', id)
    if (!error) fetchVeriler()
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black tracking-tighter uppercase mb-8">Satış Ekranı Ayarları</h1>

        <div className="grid grid-cols-12 gap-8">
          {/* SOL: KATEGORİ YÖNETİMİ */}
          <div className="col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border">
              <h2 className="font-black uppercase text-xs mb-4 text-indigo-600">Satış Kategorileri</h2>
              <div className="flex gap-2 mb-4">
                <input 
                  className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-bold border-none"
                  placeholder="Kategori Adı..." 
                  value={yeniKategori} 
                  onChange={e => setYeniKategori(e.target.value)} 
                />
                <button onClick={kategoriEkle} className="bg-slate-900 text-white px-4 rounded-xl font-bold">+</button>
              </div>
              <div className="space-y-2">
                {kategoriler.map(k => (
                  <div key={k.id} className="p-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase flex justify-between items-center">
                    {k.ad}
                    <button onClick={async () => {await supabase.from('kategoriler').delete().eq('id', k.id); fetchVeriler();}} className="text-rose-500">SİL</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SAĞ: ÜRÜN SEÇİMİ */}
          <div className="col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
                  <tr>
                    <th className="p-5">Stok Adı</th>
                    <th className="p-5">Kategori</th>
                    <th className="p-5">Barkod</th>
                    <th className="p-5 text-center">Satışa Aç</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs font-bold text-slate-600">
                  {stoklar.map(s => (
                    <tr key={s.id} className={s.satis_ekraninda_goster ? 'bg-indigo-50/50' : ''}>
                      <td className="p-5 font-black uppercase">{s.urun_adi}</td>
                      <td className="p-5">
                        <select 
                          className="bg-transparent border-none focus:ring-0 text-[10px] font-black"
                          value={s.kategori_id || ''} 
                          onChange={(e) => urunGuncelle(s.id, 'kategori_id', e.target.value)}
                        >
                          <option value="">KATEGORİ YOK</option>
                          {kategoriler.map(k => <option key={k.id} value={k.id}>{k.ad.toUpperCase()}</option>)}
                        </select>
                      </td>
                      <td className="p-5">
                        <input 
                          className="bg-slate-100 p-1 rounded w-24 text-[10px] border-none"
                          placeholder="Barkod..."
                          defaultValue={s.barkod}
                          onBlur={(e) => urunGuncelle(s.id, 'barkod', e.target.value)}
                        />
                      </td>
                      <td className="p-5 text-center">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded-lg text-indigo-600 border-slate-300 focus:ring-indigo-500"
                          checked={s.satis_ekraninda_goster} 
                          onChange={(e) => urunGuncelle(s.id, 'satis_ekraninda_goster', e.target.checked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}