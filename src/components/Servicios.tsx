import React, { useState } from 'react';
import { Plus, Trash2, Search, Wrench } from 'lucide-react';
import { WebService } from '../types';

interface ServiciosProps {
  services: WebService[];
  onRefresh: () => void;
}

const ICONS = ['Wrench', 'Cpu', 'Monitor', 'Smartphone', 'Printer', 'HardDrive', 'Network', 'Shield', 'Tool', 'Camera', 'Headphones', 'Mouse', 'Server', 'Database', 'Settings', 'Sliders', 'Box', 'Package', 'Truck', 'Trophy'];

export default function Servicios({ services, onRefresh }: ServiciosProps) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: 'Wrench' });

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', description: '', icon: 'Wrench' });
    setShowModal(true);
  };

  const openEdit = (s: WebService) => {
    setEditingId(s.id);
    setForm({ name: s.name, description: s.description, icon: s.icon });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { alert('El nombre es obligatorio'); return; }
    try {
      const res = await fetch('/api/web-data');
      const data = await res.json();
      if (editingId) {
        const idx = data.services.findIndex((s: WebService) => s.id === editingId);
        if (idx !== -1) data.services[idx] = { ...data.services[idx], ...form };
      } else {
        data.services.push({ id: Date.now().toString(), ...form });
      }
      await fetch('/api/web-save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      setShowModal(false);
      onRefresh();
    } catch { alert('Error al guardar'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este servicio?')) return;
    try {
      const res = await fetch('/api/web-data');
      const data = await res.json();
      data.services = data.services.filter((s: WebService) => s.id !== id);
      await fetch('/api/web-save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      onRefresh();
    } catch { alert('Error al eliminar'); }
  };

  const filtered = services.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Servicios</h2>
          <p className="text-[11px] text-slate-500">Servicios técnicos ofrecidos en la página web</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500"><Search size={14} /></span>
            <input type="text" className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none" placeholder="Buscar servicio..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={openNew} className="bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg py-1.5 px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"><Plus size={13} />Nuevo</button>
        </div>
      </div>

      <div className="bg-[#111318] border border-[#1f242e] rounded-xl p-5">
        {filtered.length === 0 ? (
          <div className="p-12 text-slate-500 italic text-center text-xs">No hay servicios registrados.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => (
              <div key={s.id} className="bg-[#0d0e12] border border-[#1f242e] rounded-lg p-4 flex items-start gap-3 hover:border-[#2d3444] transition-colors">
                <div className="h-9 w-9 rounded-lg bg-[#181a20] border border-[#2d3444] flex items-center justify-center text-[#5aa6ec] shrink-0"><Wrench size={16} /></div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{s.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{s.description}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="text-slate-500 hover:text-white transition-colors cursor-pointer p-1" title="Editar"><Wrench size={12} /></button>
                  <button onClick={() => handleDelete(s.id)} className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer p-1" title="Eliminar"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#111318] border border-[#2d3444] rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-[#2d3444] pb-3 mb-4">
              <span className="font-semibold text-white font-display">{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</span>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-xs">Cerrar</button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Nombre *</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Descripción</label><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Icono</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setForm({ ...form, icon: ic })} className={`h-8 w-8 rounded-lg border flex items-center justify-center text-xs transition-all cursor-pointer ${form.icon === ic ? 'bg-[#5aa6ec] text-[#0c0d10] border-[#5aa6ec]' : 'bg-[#181a20] border-[#2d3444] text-slate-400 hover:text-white'}`}>
                      <Wrench size={14} />
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleSave} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg text-xs transition-all cursor-pointer">{editingId ? 'Actualizar' : 'Crear Servicio'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
