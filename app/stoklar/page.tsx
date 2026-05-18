{/* Yeni Stok Kartı Modalı */}
<div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-4">
  <div className="bg-white p-10 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
    <h2 className="text-3xl font-black mb-6 uppercase italic tracking-tighter">YENİ STOK KARTI</h2>
    
    <form className="space-y-4">
      {/* Ürün Adı */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Ürün Adı</label>
        <input 
          type="text" 
          placeholder="Örn: Chocolate Butter Cake" 
          className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-200/60 focus:ring-slate-900 focus:bg-white transition-all outline-none"
          required
        />
      </div>

      {/* İkili Satır: Kategori & Birim */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Kategori</label>
          <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-200/60 focus:ring-slate-900 focus:bg-white transition-all outline-none">
            <option value="">Kategori Seçiniz...</option>
            {/* kategoriler.map(...) */}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Birim</label>
          <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-200/60 focus:ring-slate-900 focus:bg-white transition-all outline-none">
            <option value="">Birim Seçiniz...</option>
            {/* birimler.map(...) */}
          </select>
        </div>
      </div>

      {/* İkili Satır: Stok Türü & Barkod */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Stok Türü</label>
          <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-200/60 focus:ring-slate-900 focus:bg-white transition-all outline-none">
            <option value="">Stok Türü Seçiniz...</option>
            {/* stokTurleri.map(...) */}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Barkod</label>
          <input 
            type="text" 
            placeholder="Barkod numarası taratın veya yazın" 
            className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-200/60 focus:ring-slate-900 focus:bg-white transition-all outline-none"
          />
        </div>
      </div>

      {/* Üçlü Satır: Alış, Satış Fiyatı ve KDV */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Alış Fiyatı (₺)</label>
          <input 
            type="number" 
            placeholder="0.00" 
            className="w-full p-4 bg-slate-50 rounded-2xl font-black text-lg border-none ring-1 ring-slate-200/60 focus:ring-slate-900 focus:bg-white transition-all outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Satış Fiyatı (₺)</label>
          <input 
            type="number" 
            placeholder="0.00" 
            className="w-full p-4 bg-slate-50 rounded-2xl font-black text-lg border-none ring-1 ring-slate-200/60 focus:ring-slate-900 focus:bg-white transition-all outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">KDV Oranı (%)</label>
          <input 
            type="number" 
            placeholder="20" 
            className="w-full p-4 bg-slate-50 rounded-2xl font-black text-lg border-none ring-1 ring-slate-200/60 focus:ring-slate-900 focus:bg-white transition-all outline-none"
          />
        </div>
      </div>

      {/* Minimum Stok Seviyesi */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Minimum Stok Seviyesi</label>
        <input 
          type="number" 
          placeholder="0" 
          className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-200/60 focus:ring-slate-900 focus:bg-white transition-all outline-none"
        />
      </div>

      {/* POS Satış Ekranı Switch */}
      <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 ring-1 ring-slate-200/60">
        <input type="checkbox" id="pos_goster" className="w-4 h-4 accent-slate-900" />
        <label htmlFor="pos_goster" className="text-xs font-black uppercase text-slate-700 select-none cursor-pointer">POS SATIŞ EKRANINDA GÖSTER</label>
      </div>

      {/* Kaydet Butonu */}
      <button type="submit" className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black uppercase shadow-lg hover:bg-slate-900 transition-all active:scale-[0.99] mt-2">
        KAYDET
      </button>
    </form>
  </div>
</div>