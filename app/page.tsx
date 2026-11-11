"use client";

import React, { useState, useEffect } from "react";
import Tesseract from "tesseract.js";
import { Camera, Trash2, Edit3, Plus, RefreshCw, Smartphone } from "lucide-react";

// URL do seu Web App no Google Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJzppKf_B5kaWklkTEN-EIZzr9aiGLihbXkiRFXGFhg_O0WThgWyvQVVNpxkWn2oS4Bg/exec";

interface ItemEstoque {
  rowIndex?: number;
  "Data / Hora": string;
  Modelo: string;
  Memória: string;
  IMEI: string;
  "Serial Number": string;
  EID: string;
}

export default function Home() {
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<ItemEstoque>({
    "Data / Hora": "",
    Modelo: "",
    Memória: "",
    IMEI: "",
    "Serial Number": "",
    EID: "",
  });

  // 1. Carregar Dados da Planilha via GET
  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL);
      const data = await res.json();
      if (Array.isArray(data)) {
        setItens(data);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Google Sheets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // 2. Leitura OCR da foto (Câmera ou Upload)
  const processarImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const result = await Tesseract.recognize(file, "eng");
      const text = result.data.text;

      // Regex para extrair os dados da caixa do iPhone
      const imeiMatch = text.match(/\b\d{15}\b/)?.[0] || "";
      const eidMatch = text.match(/\b\d{32}\b/)?.[0] || "";
      const serialMatch = text.match(/(?:Serial\s*No\.?|S\/N|\(S\))\s*([A-Z0-9]{10,12})/i)?.[1] || "";
      const modeloMatch = text.match(/iPhone\s*\d{1,2}(?:\s*Pro)?(?:\s*Max)?(?:\s*Plus)?/i)?.[0] || "iPhone";
      const memoriaMatch = text.match(/\b(64GB|128GB|256GB|512GB|1TB)\b/i)?.[0] || "";

      setFormData({
        "Data / Hora": new Date().toLocaleString("pt-BR"),
        Modelo: modeloMatch,
        Memória: memoriaMatch.toUpperCase(),
        IMEI: imeiMatch,
        "Serial Number": serialMatch.toUpperCase(),
        EID: eidMatch,
      });
    } catch (err) {
      alert("Erro ao processar a imagem do selo.");
    } finally {
      setScanning(false);
    }
  };

  // 3. Salvar (Inserir ou Atualizar) no Google Sheets via POST
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const action = formData.rowIndex ? "update" : "create";

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", // Para evitar problemas de CORS com Google Apps Script
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          data: formData,
          rowIndex: formData.rowIndex,
        }),
      });

      // Limpa o formulário e recarrega a lista
      setFormData({ "Data / Hora": "", Modelo: "", Memória: "", IMEI: "", "Serial Number": "", EID: "" });
      setTimeout(() => carregarDados(), 1000);
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Excluir item no Google Sheets via POST
  const handleDelete = async (rowIndex: number) => {
    if (!confirm("Tem certeza que deseja remover este iPhone do estoque?")) return;
    setLoading(true);
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", rowIndex }),
      });
      setTimeout(() => carregarDados(), 1000);
    } catch (err) {
      console.error("Erro ao deletar:", err);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white">
              <Smartphone size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Estoque de iPhones</h1>
              <p className="text-xs text-slate-400">Leitura Inteligente OCR & Google Sheets</p>
            </div>
          </div>
          <button
            onClick={carregarDados}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
            title="Atualizar Dados"
          >
            <RefreshCw className={loading ? "animate-spin text-blue-400" : "text-slate-300"} size={20} />
          </button>
        </div>

        {/* Captura por Câmera & Formulário */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-semibold">Escanear Selo da Caixa</h2>
              <p className="text-xs text-slate-400">Use a câmera do celular ou suba uma foto para ler IMEI, Serial e EID.</p>
            </div>
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition w-full sm:w-auto justify-center">
              <Camera size={20} />
              {scanning ? "Lendo com OCR..." : "Tirar Foto / Subir Imagem"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={processarImagem}
                className="hidden"
                disabled={scanning}
              />
            </label>
          </div>

          {/* Form para conferência / inserção manual */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Modelo</label>
              <input
                className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm"
                placeholder="Ex: iPhone 15 Pro"
                value={formData.Modelo}
                onChange={(e) => setFormData({ ...formData, Modelo: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Memória</label>
              <input
                className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm"
                placeholder="Ex: 128GB, 256GB"
                value={formData.Memória}
                onChange={(e) => setFormData({ ...formData, Memória: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">IMEI (15 dígitos)</label>
              <input
                className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm font-mono"
                placeholder="35489110..."
                value={formData.IMEI}
                onChange={(e) => setFormData({ ...formData, IMEI: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Serial Number</label>
              <input
                className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm font-mono"
                placeholder="Ex: DX3G1081N72N"
                value={formData["Serial Number"]}
                onChange={(e) => setFormData({ ...formData, "Serial Number": e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-400 block mb-1">EID (32 dígitos)</label>
              <input
                className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-800 focus:border-blue-500 outline-none text-sm font-mono"
                placeholder="8904903200500..."
                value={formData.EID}
                onChange={(e) => setFormData({ ...formData, EID: e.target.value })}
              />
            </div>

            <div className="md:col-span-3 flex justify-end gap-3 pt-2">
              {formData.rowIndex && (
                <button
                  type="button"
                  onClick={() => setFormData({ "Data / Hora": "", Modelo: "", Memória: "", IMEI: "", "Serial Number": "", EID: "" })}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 text-sm font-medium"
                >
                  Cancelar Edição
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 text-sm"
              >
                <Plus size={18} />
                {submitting ? "Salvação em andamento..." : formData.rowIndex ? "Atualizar iPhone" : "Salvar no Estoque"}
              </button>
            </div>
          </form>
        </div>

        {/* Tabela de Itens */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-semibold text-sm flex justify-between items-center">
            <span>Itens Cadastrados no Estoque</span>
            <span className="text-xs text-slate-400 font-normal">Total: {itens.length} aparelhos</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-3.5">Data / Hora</th>
                  <th className="p-3.5">Modelo</th>
                  <th className="p-3.5">Memória</th>
                  <th className="p-3.5">IMEI</th>
                  <th className="p-3.5">Serial</th>
                  <th className="p-3.5">EID</th>
                  <th className="p-3.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      {loading ? "Carregando dados da planilha..." : "Nenhum iPhone cadastrado no momento."}
                    </td>
                  </tr>
                ) : (
                  itens.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 text-xs text-slate-400">{item["Data / Hora"]}</td>
                      <td className="p-3.5 font-bold text-white">{item.Modelo}</td>
                      <td className="p-3.5 text-slate-300">{item.Memória}</td>
                      <td className="p-3.5 font-mono text-xs text-slate-300">{item.IMEI}</td>
                      <td className="p-3.5 font-mono text-xs text-slate-300">{item["Serial Number"]}</td>
                      <td className="p-3.5 font-mono text-xs text-slate-400 max-w-[140px] truncate">{item.EID || "-"}</td>
                      <td className="p-3.5">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setFormData(item)}
                            className="p-1.5 text-amber-400 hover:bg-slate-800 rounded-lg"
                            title="Editar"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => item.rowIndex && handleDelete(item.rowIndex)}
                            className="p-1.5 text-rose-400 hover:bg-slate-800 rounded-lg"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}