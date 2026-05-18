'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function UretimEmriSayfasi() {
  const [mamuller, setMamuller] = useState<any[]>([])
  const [subeler, setSubeler] = useState<any[]>([])
  const [uretimler, setUretimler] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [seciliRecete, setSeciliRecete] = useState<any[]>([])
  
  // Filtre State'leri
  const [aramaTerimi, setAramaTerimi] = useState('')
  const [listeArama, setListeArama] = useState('')
  const [baslangicTarih, setBaslangicTarih] = useState('')
  const [bitisTarih, setBitisTarih] = useState('')
  
  const [form, setForm] = useState({ mamul_id: '', mamul_adi: '', sube_id: '', sube_adi: '', miktar: 1 })
  const [ürünPanelAcik, setÜrünPanelAcik] = useState(false)
  const ürünRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    verileriGetir();
    const handleClickOutside = (e: any) => {
      if (ürünRef.current && !ürünRef.current.contains(e.target)) setÜrünPanelAcik(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const verileriGetir = async () => {
    const { data: stoklar } = await supabase.from('stok_kartlari').select(`id, urun_adi, mevcut_stok, stok_turleri(tur_adi)`)
    setMamuller(stoklar?.filter(s => s.stok_turleri?.tur_adi?.toUpperCase().includes("MAMUL")) || [])
    
    const { data: subeData } = await supabase.from('subeler').select('*').order('sube_adi')
    setSubeler(subeData || [])

    const { data: uretimData } = await supabase.from('stok_hareketleri')
      .select(`id, tarih, miktar, aciklama, stok_kartlari(urun_adi), subeler(sube_adi)`)
      .eq('islem_turu', 'URETIM_GIRIS')
      .order('tarih', { ascending: false })
    setUretimler(uretimData || [])
  }

  const receteGetir = async (id: string) => {
    const { data } = await supabase.from('tarifler').select(`miktar, hammadde:stok_kartlari!hammadde_id(id, urun_adi, mevcut_stok)`).eq('mamul_id', id)
    setSeciliRecete(data || [])
  }

  const uretimKaydet = async () => {
    if (!form.mamul_id || !form.sube_id) return alert("Eksik alanları doldurun.");
    setLoading(true);
    const uretimKodu = `URT-${Date.now()}`;
    const hammaddeCikislar = seciliRecete.map(r => ({ stok_id: r.hammadde.id, sube_id: form.sube_id, islem_turu: 'URETIM_CIKIS', miktar: r.miktar * form.miktar, aciklama: uretimKodu }));
    const mamulGiris = { stok_id: form.mamul_id, sube_id: form.sube_id, islem_turu: 'URETIM_GIRIS', miktar: form.miktar, aciklama: uretimKodu };
    
    await supabase.from('stok_hareketleri').insert([...hammaddeCikislar, mamulGiris]);
    setForm({ ...form, mamul_id: '', mamul_adi: '', miktar: 1 });
    setSeciliRecete([]);
    verileriGetir();
    setLoading(false);
  }

  // LİSTE FİLTRELEME MANTIĞI
  const filtrelenmisUretimler = uretimler.filter(u => {
    const metinUygun = u.stok_kartlari?.urun_adi.toLowerCase().includes(listeArama.toLowerCase());
    const tarih = new Date(u.tarih).toISOString().split('T')[0];
    const baslangicUygun = baslangicTarih ? tarih >= baslangicTarih : true;
    const bitisUygun = bitisTarih ? tarih <= bitisTarih : true;
    return metinUygun && baslangicUygun && bitisUygun;
  });

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black text-rose-600 tracking-tighter uppercase">Üretim Hattı</h1>
          <div className="flex gap-2">
            <input type="date" className="p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none" value={baslangicTarih} onChange={e => setBaslangicTarih(e.target.value)} />
            <input type="date" className="p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none" value={bitisTarih} onChange={e => setBitisTarih(e.target.value)} />
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-4 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 h-fit sticky top-8">
             {/* Form içeriği aynı kalıyor, görsel sadelik için devam ediyorum... */}
             <div className="space-y-4">
                <select className="w-full p-4 rounded-2xl bg-slate-50 font-bold outline-none border-none" value={form.sube_id} onChange={e => setForm({...form, sube_id: e.target.value})}>
                  <option value="">Şube Seçiniz...</option>
                  {subeler.map(s => <option key={s.id} value={s.id}>{s.sube_adi}</option>)}
                </select>

                <div className="relative" ref={ürünRef}>
                  <div onClick={() => setÜrünPanelAcik(true)} className="w-full p-4 rounded-2xl bg-slate-50 font-bold cursor-pointer border-2 border-transparent hover:border-rose-500 transition-all">
                    {form.mamul_adi || "Üretilecek Ürün..."}
                  </div>
                  {ürünPanelAcik && (
                    <div className="absolute w-full mt-2 bg-white shadow-2xl rounded-2xl z-50 border overflow-hidden">
                      <input className="w-full p-4 border-b outline-none font-bold bg-rose-50/30" placeholder="Ürün ara..." value={aramaTerimi} onChange={e => setAramaTerimi(e.target.value)} />
                      <div className="max-h-60 overflow-y-auto">
                        {mamuller.filter(m => m.urun_adi.toLowerCase().includes(aramaTerimi.toLowerCase())).map(m => (
                          <div key={m.id} className="p-4 hover:bg-rose-500 hover:text-white cursor-pointer border-b flex justify-between items-center transition-colors font-bold"
                            onClick={() => { setForm({...form, mamul_id: m.id, mamul_adi: m.urun_adi}); receteGetir(m.id); setÜrünPanelAcik(false); }}>
                            <span className="text-sm">{m.urun_adi}</span>
                            <span className="text-[10px] opacity-70">Stok: {m.mevcut_stok}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {seciliRecete.length > 0 && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-2">
                    {seciliRecete.map((r, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-white text-[10px] font-bold">{r.hammadde.urun_adi}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${r.hammadde.mevcut_stok < (r.miktar * form.miktar) ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>{r.hammadde.mevcut_stok}</span>
                      </div>
                    ))}
                  </div>
                )}

                <input type="number" className="w-full p-6 rounded-[2rem] bg-rose-50 text-4xl font-black text-rose-600 text-center outline-none" value={form.miktar} onChange={e => setForm({...form, miktar: parseFloat(e.target.value) || 0})} />
                <button onClick={uretimKaydet} disabled={loading} className="w-full py-5 rounded-3xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-all uppercase tracking-widest shadow-lg shadow-rose-100">KAYDET</button>
             </div>
          </div>

          <div className="col-span-8 space-y-4">
            <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 flex items-center gap-4">
              <span className="ml-2 text-slate-300">🔎</span>
              <input placeholder="Üretim listesinde ara..." className="flex-1 bg-transparent outline-none font-bold text-slate-600" value={listeArama} onChange={e => setListeArama(e.target.value)} />
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr><th className="p-8">Ürün</th><th className="p-8 text-center">Miktar</th><th className="p-8 text-right">Zaman</th></tr>
                </thead>
                <tbody className="divide-y">
                  {filtrelenmisUretimler.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-8 font-black text-slate-800 text-lg uppercase">{u.stok_kartlari?.urun_adi} <br/><span className="text-[9px] text-rose-500">{u.subeler?.sube_adi}</span></td>
                      <td className="p-8 text-center font-black text-2xl text-slate-600">{u.miktar}</td>
                      <td className="p-8 text-right text-[10px] font-bold text-slate-400">{new Date(u.tarih).toLocaleString('tr-TR')}</td>
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