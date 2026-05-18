'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function ZayiTakibiSayfasi() {
  const [stoklar, setStoklar] = useState<any[]>([])
  const [subeler, setSubeler] = useState<any[]>([])
  const [zayiler, setZayiler] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Filtre State'leri
  const [aramaTerimi, setAramaTerimi] = useState('')
  const [listeArama, setListeArama] = useState('')
  const [baslangicTarih, setBaslangicTarih] = useState('')
  const [bitisTarih, setBitisTarih] = useState('')

  const [ürünPanelAcik, setÜrünPanelAcik] = useState(false)
  const ürünRef = useRef<HTMLDivElement>(null)

  // Form State (Neden alanı geri eklendi)
  const [form, setForm] = useState({ 
    stok_id: '', 
    urun_adi: '', 
    sube_id: '', 
    miktar: 1, 
    neden: 'BOZULMA', 
    mevcut_stok: 0,
    birim_fiyat: 0 
  })

  useEffect(() => {
    verileriGetir();
    const handleClickOutside = (e: any) => {
      if (ürünRef.current && !ürünRef.current.contains(e.target)) setÜrünPanelAcik(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const verileriGetir = async () => {
    // Doğrudan mevcut_stok sütununu çekiyoruz
    const { data: stokData } = await supabase
      .from('stok_kartlari')
      .select('id, urun_adi, mevcut_stok, alis_fiyati')
    setStoklar(stokData || [])
    
    const { data: subeData } = await supabase.from('subeler').select('*').order('sube_adi')
    setSubeler(subeData || [])

    const { data: zayiData } = await supabase.from('stok_hareketleri')
      .select(`id, tarih, miktar, aciklama, stok_kartlari(urun_adi, alis_fiyati), subeler(sube_adi)`)
      .eq('islem_turu', 'ZAYI_CIKIS')
      .order('tarih', { ascending: false })
    setZayiler(zayiData || [])
  }

  const zayiKaydet = async () => {
    if (!form.stok_id || !form.sube_id) return alert("Lütfen ürün ve şube seçiniz.");
    setLoading(true);
    
    const { error } = await supabase.from('stok_hareketleri').insert([{ 
      stok_id: form.stok_id, 
      sube_id: form.sube_id, 
      islem_turu: 'ZAYI_CIKIS', 
      miktar: form.miktar, 
      aciklama: `NEDEN: ${form.neden}` // Seçilen neden buraya kaydedilir
    }]);

    if(!error) {
      setForm({ ...form, stok_id: '', urun_adi: '', miktar: 1, mevcut_stok: 0 });
      verileriGetir();
      alert("Zayi kaydı başarıyla işlendi.");
    }
    setLoading(false);
  }

  const filtrelenmisZayiler = zayiler.filter(z => {
    const metinUygun = z.stok_kartlari?.urun_adi.toLowerCase().includes(listeArama.toLowerCase());
    const tarih = new Date(z.tarih).toISOString().split('T')[0];
    const baslangicUygun = baslangicTarih ? tarih >= baslangicTarih : true;
    const bitisUygun = bitisTarih ? tarih <= bitisTarih : true;
    return metinUygun && baslangicUygun && bitisUygun;
  });

  return (
    <div className="p-8 bg-[#F3F4F6] min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER & TARİH FİLTRESİ */}
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-black text-amber-600 tracking-tighter uppercase">Zayi Takibi</h1>
            <p className="text-slate-400 font-bold text-xs">Fire ve bozulma yönetim paneli.</p>
          </div>
          <div className="flex gap-2">
            <input type="date" className="p-3 rounded-xl border-none shadow-sm text-xs font-bold outline-none" value={baslangicTarih} onChange={e => setBaslangicTarih(e.target.value)} />
            <input type="date" className="p-3 rounded-xl border-none shadow-sm text-xs font-bold outline-none" value={bitisTarih} onChange={e => setBitisTarih(e.target.value)} />
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          
          {/* SOL: KAYIT FORMU */}
          <div className="col-span-4 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 h-fit sticky top-8">
            <h3 className="text-[11px] font-black text-slate-400 mb-6 uppercase tracking-widest">⚠️ Yeni Kayıt</h3>
            
            <div className="space-y-5">
              {/* ŞUBE VE NEDEN SEÇİMİ */}
              <div className="grid grid-cols-2 gap-3">
                <select className="p-4 rounded-2xl bg-slate-50 font-bold text-xs outline-none border-none" value={form.sube_id} onChange={e => setForm({...form, sube_id: e.target.value})}>
                  <option value="">Şube...</option>
                  {subeler.map(s => <option key={s.id} value={s.id}>{s.sube_adi}</option>)}
                </select>
                <select className="p-4 rounded-2xl bg-slate-50 font-bold text-xs outline-none border-none" value={form.neden} onChange={e => setForm({...form, neden: e.target.value})}>
                  <option value="BOZULMA">BOZULMA</option>
                  <option value="DÖKÜLME">DÖKÜLME</option>
                  <option value="HATALI ÜRETİM">HATALI ÜRETM.</option>
                  <option value="TARİHİ GEÇMİŞ">TARİHİ GEÇMİŞ</option>
                </select>
              </div>

              {/* ÜRÜN ARAMA PANALİ */}
              <div className="relative" ref={ürünRef}>
                <div onClick={() => setÜrünPanelAcik(true)} className="w-full p-4 rounded-2xl bg-slate-50 font-bold text-sm cursor-pointer border-2 border-transparent hover:border-amber-500 transition-all">
                  {form.urun_adi || "Ürün Ara..."}
                </div>
                {ürünPanelAcik && (
                  <div className="absolute w-full mt-2 bg-white shadow-2xl rounded-2xl z-50 border overflow-hidden">
                    <input className="w-full p-4 border-b outline-none font-bold bg-amber-50/30" placeholder="Ara..." value={aramaTerimi} onChange={e => setAramaTerimi(e.target.value)} />
                    <div className="max-h-60 overflow-y-auto">
                      {stoklar.filter(s => s.urun_adi.toLowerCase().includes(aramaTerimi.toLowerCase())).map(s => (
                        <div key={s.id} className="p-4 hover:bg-amber-600 hover:text-white cursor-pointer border-b flex justify-between font-bold" 
                             onClick={() => { setForm({...form, stok_id: s.id, urun_adi: s.urun_adi, mevcut_stok: s.mevcut_stok, birim_fiyat: s.alis_fiyati}); setÜrünPanelAcik(false); }}>
                          <span className="text-sm">{s.urun_adi}</span>
                          <span className="text-[10px] opacity-70">Stok: {s.mevcut_stok}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* STOK VE MALİYET KARTLARI */}
              {form.stok_id && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-900 rounded-3xl text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase">Sistem Stok</p>
                    <p className={`text-xl font-black ${form.mevcut_stok > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{form.mevcut_stok}</p>
                  </div>
                  <div className="p-4 bg-slate-900 rounded-3xl text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase">Birim Fiyat</p>
                    <p className="text-xl font-black text-amber-500">{form.birim_fiyat} ₺</p>
                  </div>
                </div>
              )}

              {/* MİKTAR GİRİŞİ */}
              <div className="p-6 bg-amber-50 rounded-[2rem] border-2 border-amber-100/50">
                <label className="text-[10px] font-black text-amber-400 uppercase block text-center mb-2">Zayi Edilen Miktar</label>
                <input type="number" className="w-full bg-transparent text-5xl font-black text-amber-600 text-center outline-none" value={form.miktar} onChange={e => setForm({...form, miktar: parseFloat(e.target.value) || 0})} />
              </div>

              <button onClick={zayiKaydet} disabled={loading} className="w-full py-5 rounded-3xl bg-amber-600 text-white font-black hover:bg-amber-700 transition-all uppercase tracking-widest shadow-lg shadow-amber-100">
                {loading ? 'KAYDEDİLİYOR...' : 'KAYDI TAMAMLA'}
              </button>
            </div>
          </div>

          {/* SAĞ: LİSTE VE ARAMA */}
          <div className="col-span-8 space-y-4">
            <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-200 flex items-center gap-4">
              <span className="ml-2 text-slate-300">🔎</span>
              <input placeholder="Zayi geçmişinde ara..." className="flex-1 bg-transparent outline-none font-bold text-slate-600" value={listeArama} onChange={e => setListeArama(e.target.value)} />
            </div>

            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                  <tr><th className="p-8">Ürün / Neden / Şube</th><th className="p-8 text-center">Miktar</th><th className="p-8 text-right">Zaman</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtrelenmisZayiler.map(z => (
                    <tr key={z.id} className="hover:bg-slate-50/50 transition-colors font-bold text-slate-700 uppercase">
                      <td className="p-8">
                        <div className="text-lg tracking-tighter">{z.stok_kartlari?.urun_adi}</div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[9px] font-black px-2 py-0.5 bg-amber-100 text-amber-700 rounded">{z.aciklama}</span>
                          <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded">{z.subeler?.sube_adi}</span>
                        </div>
                      </td>
                      <td className="p-8 text-center text-2xl tracking-tighter">{z.miktar}</td>
                      <td className="p-8 text-right text-[11px] text-slate-400 lowercase font-medium">
                        {new Date(z.tarih).toLocaleString('tr-TR')}
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