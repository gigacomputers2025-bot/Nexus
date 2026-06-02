import React, { useState } from 'react';
import { Store, Search, RefreshCw, Download, Upload, Globe, Image, Settings, Plus, Trash2, BarChart3, MessageCircle } from 'lucide-react';

interface PanelWebProps {
  webData: any;
  onRefresh: () => void;
}

export default function PanelWeb({ webData, onRefresh }: PanelWebProps) {
  const config = webData?.config || {};
  const categories = webData?.categories || [];
  const banners = config.banners || [];
  const [activeSection, setActiveSection] = useState('config');

  const handleSave = async (updated: any) => {
    try {
      await fetch('/api/web-save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      onRefresh();
    } catch { alert('Error al guardar'); }
  };

  const updateConfig = (patch: any) => {
    const updated = { ...webData, config: { ...config, ...patch } };
    handleSave(updated);
  };

  const updateFull = (updated: any) => handleSave(updated);

  const handleSync = async () => {
    if (!window.confirm('¿Sincronizar todo con GitHub? Se hará push forzado.')) return;
    try {
      const res = await fetch('/api/web-sync-full', { method: 'POST' });
      const data = await res.json();
      alert(data.success ? 'Sincronización exitosa' : 'Error: ' + (data.error || ''));
    } catch { alert('Error de conexión'); }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(webData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `web-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!data.products) throw new Error('Formato inválido');
        await fetch('/api/web-save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        onRefresh();
        alert('Datos importados correctamente');
      } catch { alert('Archivo inválido'); }
    };
    input.click();
  };

  const tabs = [
    { id: 'config', label: 'Empresa', icon: <Store size={13} /> },
    { id: 'seo', label: 'SEO', icon: <BarChart3 size={13} /> },
    { id: 'popup', label: 'Popup', icon: <MessageCircle size={13} /> },
    { id: 'banners', label: 'Banners', icon: <Image size={13} /> },
    { id: 'categorias', label: 'Categorías', icon: <Settings size={13} /> },
    { id: 'sync', label: 'Sync', icon: <RefreshCw size={13} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">Panel Web</h2>
        <span className="text-[10px] text-slate-500 font-mono">Configuración de la tienda online</span>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveSection(t.id)} className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeSection === t.id ? 'bg-[#5aa6ec] text-[#0c0d10]' : 'bg-[#181a20] border border-[#2d3444] text-slate-400 hover:text-white'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#111318] border border-[#1f242e] rounded-xl p-5">
        {activeSection === 'config' && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Datos de la Empresa</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Nombre</label><input type="text" value={config.companyName || ''} onChange={e => updateConfig({ companyName: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Dirección</label><input type="text" value={config.address || ''} onChange={e => updateConfig({ address: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Teléfono</label><input type="text" value={config.phone || ''} onChange={e => updateConfig({ phone: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">WhatsApp</label><input type="text" value={config.whatsapp || ''} onChange={e => updateConfig({ whatsapp: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Email</label><input type="text" value={config.email || ''} onChange={e => updateConfig({ email: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Horario</label><input type="text" value={config.hours || ''} onChange={e => updateConfig({ hours: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Instagram</label><input type="text" value={config.instagram || ''} onChange={e => updateConfig({ instagram: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Facebook</label><input type="text" value={config.facebook || ''} onChange={e => updateConfig({ facebook: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
            </div>
            <p className="text-[10px] text-slate-500">Los cambios se guardan automáticamente al escribir.</p>
          </div>
        )}

        {activeSection === 'seo' && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">SEO y Métricas</h3>
            <div><label className="text-[10px] text-slate-500 font-mono uppercase">Título del Sitio</label><input type="text" value={config.siteTitle || ''} onChange={e => updateConfig({ siteTitle: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
            <div><label className="text-[10px] text-slate-500 font-mono uppercase">Meta Descripción</label><textarea rows={2} value={config.metaDescription || ''} onChange={e => updateConfig({ metaDescription: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Google Analytics ID</label><input type="text" value={config.ga4Id || ''} onChange={e => updateConfig({ ga4Id: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white font-mono focus:outline-none" placeholder="G-XXXXXXXXXX" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Google Tag Manager</label><input type="text" value={config.gtmId || ''} onChange={e => updateConfig({ gtmId: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white font-mono focus:outline-none" placeholder="GTM-XXXXXXX" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Límite Productos</label><input type="number" value={config.productLimit || ''} onChange={e => updateConfig({ productLimit: parseInt(e.target.value) || 0 })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={config.randomOrder || false} onChange={e => updateConfig({ randomOrder: e.target.checked })} className="h-4 w-4 bg-[#181a20] border-[#2d3444] rounded" />Orden aleatorio</label></div>
            </div>
          </div>
        )}

        {activeSection === 'popup' && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Popup Promocional</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={config.popupActive || false} onChange={e => updateConfig({ popupActive: e.target.checked })} className="h-4 w-4 bg-[#181a20] border-[#2d3444] rounded" />Activo</label>
              <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={config.popupAlways || false} onChange={e => updateConfig({ popupAlways: e.target.checked })} className="h-4 w-4 bg-[#181a20] border-[#2d3444] rounded" />Mostrar siempre</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Duración (seg)</label><input type="number" value={config.popupDuration || 5} onChange={e => updateConfig({ popupDuration: parseInt(e.target.value) || 5 })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 font-mono uppercase">Delay (seg)</label><input type="number" value={config.popupDelay || 2} onChange={e => updateConfig({ popupDelay: parseInt(e.target.value) || 2 })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
            </div>
            <div><label className="text-[10px] text-slate-500 font-mono uppercase">Texto</label><textarea rows={2} value={config.popupText || ''} onChange={e => updateConfig({ popupText: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
            <div><label className="text-[10px] text-slate-500 font-mono uppercase">URL de Imagen</label><input type="text" value={config.popupImage || ''} onChange={e => updateConfig({ popupImage: e.target.value })} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
          </div>
        )}

        {activeSection === 'banners' && (
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Carrusel de Banners</h3>
              <button onClick={() => updateConfig({ banners: [...banners, { image: '', title: '', link: '', description: '' }] })} className="bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg py-1.5 px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"><Plus size={13} />Agregar</button>
            </div>
            {banners.length === 0 ? <p className="text-xs text-slate-500 italic">Sin banners configurados.</p> : banners.map((b: any, i: number) => (
              <div key={i} className="bg-[#0d0e12] border border-[#1f242e] rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center"><span className="text-[10px] text-slate-500 font-mono uppercase">Banner #{i + 1}</span><button onClick={() => { const bs = [...banners]; bs.splice(i, 1); updateConfig({ banners: bs }); }} className="text-red-400 hover:text-red-300 cursor-pointer"><Trash2 size={12} /></button></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-slate-500 font-mono">Título</label><input type="text" value={b.title || ''} onChange={e => { const bs = [...banners]; bs[i] = { ...bs[i], title: e.target.value }; updateConfig({ banners: bs }); }} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
                  <div><label className="text-[10px] text-slate-500 font-mono">Link</label><input type="text" value={b.link || ''} onChange={e => { const bs = [...banners]; bs[i] = { ...bs[i], link: e.target.value }; updateConfig({ banners: bs }); }} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
                </div>
                <div><label className="text-[10px] text-slate-500 font-mono">URL Imagen</label><input type="text" value={b.image || ''} onChange={e => { const bs = [...banners]; bs[i] = { ...bs[i], image: e.target.value }; updateConfig({ banners: bs }); }} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
                <div><label className="text-[10px] text-slate-500 font-mono">Descripción</label><input type="text" value={b.description || ''} onChange={e => { const bs = [...banners]; bs[i] = { ...bs[i], description: e.target.value }; updateConfig({ banners: bs }); }} className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none" /></div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'categorias' && (
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Categorías</h3>
            </div>
            <div className="flex gap-2">
              <input type="text" id="new-cat-input" placeholder="Nueva categoría..." className="flex-1 bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none" />
              <button onClick={() => { const inp = document.getElementById('new-cat-input') as HTMLInputElement; if (!inp.value.trim()) return; updateFull({ ...webData, categories: [...categories, { id: Date.now().toString(), name: inp.value.trim() }] }); inp.value = ''; }} className="bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg py-1.5 px-3 text-xs font-bold transition-all cursor-pointer"><Plus size={13} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 px-3 text-xs text-white">
                  {c.name}
                  <button onClick={() => updateFull({ ...webData, categories: categories.filter((x: any) => x.id !== c.id) })} className="text-slate-500 hover:text-red-400 cursor-pointer"><Trash2 size={11} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'sync' && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sincronización y Backup</h3>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleSync} className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg py-2 px-4 text-xs font-bold transition-all cursor-pointer"><RefreshCw size={13} />Sync GitHub</button>
              <button onClick={handleExport} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg py-2 px-4 text-xs font-bold transition-all cursor-pointer"><Download size={13} />Exportar Backup</button>
              <button onClick={handleImport} className="flex items-center gap-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded-lg py-2 px-4 text-xs font-bold transition-all cursor-pointer"><Upload size={13} />Importar Backup</button>
              <a href="/web/" target="_blank" className="flex items-center gap-1.5 bg-[#181a20] border border-[#2d3444] text-slate-300 hover:text-white rounded-lg py-2 px-4 text-xs font-bold transition-all cursor-pointer"><Globe size={13} />Ver Tienda</a>
            </div>
            <p className="text-[10px] text-slate-500">El sync completo sube todos los archivos a GitHub (push forzado).<br/>El backup exporta data.json completo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
