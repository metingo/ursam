'use client'
import { useSube } from '@/context/SubeContext'

export default function SubeSeciciNavbar() {
  const { subeler, aktifSubeId, setSube, loading } = useSube()

  if (loading) {
    return (
      <div className="h-12 w-full bg-gray-200 animate-pulse rounded-xl"></div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
      <label className="block text-[9px] font-black text-blue-500 uppercase px-2 mb-1 tracking-widest">
        Çalışılan Şube
      </label>
      <div className="relative">
        <select
          value={aktifSubeId || ''}
          onChange={(e) => setSube(e.target.value)}
          className="w-full bg-transparent border-none text-xs font-bold text-gray-700 focus:ring-0 cursor-pointer py-1 pl-2 pr-8 appearance-none"
        >
          {subeler.length === 0 && (
            <option value="">Şube Tanımlanmamış</option>
          )}
          {subeler.map((s) => (
            <option key={s.id} value={s.id} className="text-black">
              {s.sube_adi}
            </option>
          ))}
        </select>
        {/* Özel Ok İkonu */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  )
}