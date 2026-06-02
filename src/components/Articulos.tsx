import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, ArrowLeft, RefreshCw, Layers, Download } from 'lucide-react';
import { Product } from '../types';

interface ArticulosProps {
  products: Product[];
  onRefresh: () => void;
}

export default function Articulos({ products, onRefresh }: ArticulosProps) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState('');
  const [oferta, setOferta] = useState(false);
  const [nuevo, setNuevo] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleImportFromWeb = async () => {
    setImporting(true);
    try {
      const resp = await fetch('/api/import-from-web', { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        alert(data.message || `Importación completada`);
        onRefresh();
      } else {
        alert('Error al importar: ' + (data.error || 'desconocido'));
      }
    } catch (err) {
      alert('Error de red al importar. Verifique que el servidor Web-main esté corriendo en localhost:3000.');
    } finally {
      setImporting(false);
    }
  };

  // Filter products by search text
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setCode('');
    setName('');
    setPrice('');
    setCost('');
    setStock('');
    setCategory('');
    setDesc('');
    setImage('');
    setOferta(false);
    setNuevo(false);
    setEditingId(null);
    setFormOpen(false);
  };

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    setCode(product.code);
    setName(product.name);
    setPrice(product.price.toString());
    setCost(product.cost.toString());
    setStock(product.stock.toString());
    setCategory(product.category);
    setDesc(product.desc || '');
    setImage(product.image || '');
    setOferta(product.oferta || false);
    setNuevo(product.nuevo || false);
    setFormOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !price) {
      alert('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    const payload = {
      code,
      name,
      price: parseFloat(price) || 0,
      cost: parseFloat(cost) || 0,
      stock: parseInt(stock) || 0,
      category: category || 'General',
      desc,
      image,
      oferta,
      nuevo
    };

    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        onRefresh();
        resetForm();
      } else {
        alert('Ocurrió un error al guardar el producto.');
      }
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Error de red al guardar.');
    }
  };

  const handleDeleteProduct = async (id: string, productName: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar permanentemente "${productName}"?`)) {
      return;
    }

    try {
      const resp = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      if (resp.ok) {
        onRefresh();
      } else {
        alert('Ocurrió un error al eliminar el producto.');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Error de red al eliminar.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111318] border border-[#1f242e] rounded-xl p-6">
        <div>
          <h1 className="text-xl font-bold font-display text-white">Administración de Artículos (Inventario)</h1>
          <p className="text-xs text-slate-400 mt-1">Agregue, edite, audite stock y elimine productos de su catálogo.</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleImportFromWeb}
            disabled={importing}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} className={importing ? 'animate-spin' : ''} />
            {importing ? 'Importando...' : 'Importar desde Web'}
          </button>
          <button
            onClick={() => { resetForm(); setFormOpen(true); }}
            className="bg-[#5aa6ec] hover:bg-[#4691db] text-slate-900 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <Plus size={14} />
            Nuevo Artículo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Master List Column */}
        <div className={`xl:col-span-3 bg-[#111318] border border-[#1f242e] rounded-xl p-5 ${formOpen ? 'xl:col-span-3' : 'xl:col-span-4'}`}>
          {/* List Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Search size={14} />
              </span>
              <input
                type="text"
                className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                placeholder="Buscar por código, nombre o categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <Layers size={14} />
              <span>Artículos Totales: {products.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-[#1b1e26] bg-[#0d0e12]">
            {filtered.length === 0 ? (
              <div className="p-12 text-slate-500 italic text-center text-xs">
                No se encontraron artículos que coincidan con la búsqueda.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#181a20] border-b border-[#2d3444] text-[10px] tracking-wider text-slate-400 font-mono uppercase">
                    <th className="py-3 px-4 w-24">CÓDIGO</th>
                    <th className="py-3 px-4">DESCRIPCIÓN DEL ARTÍCULO</th>
                    <th className="py-3 px-4 w-32">CATEGORÍA</th>
                    <th className="py-3 px-4 text-right w-24">PRECIO VENT.</th>
                    <th className="py-3 px-4 text-center w-24">STOCK</th>
                    <th className="py-3 px-4 text-right w-24">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const isLowStock = p.stock <= 5;
                    return (
                      <tr 
                        key={p.id}
                        className="border-b border-[#1b1e26] hover:bg-[#14171e] text-xs transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-slate-400">{p.code}</td>
                        <td className="py-3 px-4 font-medium text-white flex items-center gap-1.5">
                          {p.name}
                          {p.oferta && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-red-900/40 text-red-400 border border-red-700/50">OFERTA</span>}
                          {p.nuevo && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-blue-900/40 text-blue-400 border border-blue-700/50">NUEVO</span>}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            p.source === 'local'
                              ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                              : 'bg-blue-900/40 text-blue-400 border border-blue-700/50'
                          }`}>
                            {p.source === 'local' ? 'Local' : 'Web'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          <span className="bg-[#1a1d24] border border-[#2d3444] rounded px-2 py-0.5 text-[10px]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">${p.price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-mono font-semibold px-2 py-0.5 rounded ${
                            isLowStock 
                              ? 'bg-red-950/40 text-red-400 border border-red-900/50' 
                              : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50'
                          }`}>
                            {p.stock} u
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(p)}
                              className="p-1 rounded text-slate-400 hover:text-[#5aa6ec] hover:bg-[#1f242e] transition-all"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-[#251012] transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Form Drawer (Side Panel) */}
        {formOpen && (
          <div className="bg-[#111318] border border-[#1f242e] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1f242e] pb-3 mb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                {editingId ? 'Editar Artículo' : 'Nuevo Artículo'}
              </h3>
              <button 
                onClick={resetForm}
                className="text-slate-500 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block">Código del Artículo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1003 o barra"
                  className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block">Nombre / Descripción *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Jabón de Tocador Líquido"
                  className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block">Categoría</label>
                <input
                  type="text"
                  placeholder="Ej: Bebidas, Snacks, Limpieza"
                  className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 block">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block">Precio Venta * ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block">Stock Inicial (unidades)</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block">Descripción (Web)</label>
                <textarea rows={2} placeholder="Descripción para la tienda online" className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500" value={desc} onChange={e => setDesc(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block">URL Imagen (Web)</label>
                <input type="text" placeholder="https://ejemplo.com/imagen.jpg" className="w-full bg-[#181a20] border border-[#2d3444] rounded-lg p-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500" value={image} onChange={e => setImage(e.target.value)} />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={oferta} onChange={e => setOferta(e.target.checked)} className="h-4 w-4 bg-[#181a20] border-[#2d3444] rounded" />Oferta</label>
                <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={nuevo} onChange={e => setNuevo(e.target.checked)} className="h-4 w-4 bg-[#181a20] border-[#2d3444] rounded" />Nuevo</label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white font-bold transition-all shadow cursor-pointer text-center"
                >
                  {editingId ? 'GUARDAR CAMBIOS' : 'REGISTRAR ARTÍCULO'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
