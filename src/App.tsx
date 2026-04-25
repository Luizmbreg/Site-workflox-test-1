import React, { useState, useEffect, useMemo } from 'react';
import { PDFDocument } from 'pdf-lib';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCopy, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  FileDown, 
  UserMinus, 
  UserPlus, 
  Clock,
  ExternalLink
} from 'lucide-react';

// --- Types ---
type Day = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';
const DAYS: Day[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

interface ScheduleRow {
  seg: string;
  ter: string;
  qua: string;
  qui: string;
  sex: string;
  sab: string;
  dom: string;
}

interface Pharmacist {
  id: number;
  nome: string;
  cpf: string;
  dataNascimento: string;
  tipoInclusao: 'Já vinculado' | 'Nova contratação' | 'Transferido';
  filialOrigem: string;
  entrada: ScheduleRow;
  intervalo: ScheduleRow;
  retorno: ScheduleRow;
  saida: ScheduleRow;
}

interface Actions {
  alterarHorario: boolean;
  baixaFarma: boolean;
  inclusaoFarma: boolean;
}

interface BaixaDetails {
  nome: string;
  motivo: 'Desligamento' | 'Transferência';
  filialDestino: string;
}

// --- Utils ---
const conv = (h: string) => {
  if (!h) return null;
  const [H, M] = h.split(':').map(Number);
  return H * 60 + M;
};

const fmt = (min: number) => {
  const H = Math.floor(min / 60);
  const M = min % 60;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
};

export default function App() {
  // --- State ---
  const [qtd, setQtd] = useState(1);
  const [filial, setFilial] = useState('');

  const [actions, setActions] = useState<Actions>({
    alterarHorario: false,
    baixaFarma: false,
    inclusaoFarma: false,
  });

  const [baixaDetails, setBaixaDetails] = useState<BaixaDetails>({
    nome: '',
    motivo: 'Desligamento',
    filialDestino: '',
  });

  const [abertura, setAbertura] = useState<ScheduleRow>({
    seg: '', ter: '', qua: '', qui: '', sex: '', sab: '', dom: ''
  });
  const [fechamento, setFechamento] = useState<ScheduleRow>({
    seg: '', ter: '', qua: '', qui: '', sex: '', sab: '', dom: ''
  });

  const initialScheduleRow = (): ScheduleRow => ({
    seg: '', ter: '', qua: '', qui: '', sex: '', sab: '', dom: ''
  });

  const [showPopup, setShowPopup] = useState(false);

  const [pharmacists, setPharmacists] = useState<Pharmacist[]>(
    Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      nome: '',
      cpf: '',
      dataNascimento: '',
      tipoInclusao: 'Já vinculado',
      filialOrigem: '',
      entrada: initialScheduleRow(),
      intervalo: initialScheduleRow(),
      retorno: initialScheduleRow(),
      saida: initialScheduleRow(),
    }))
  );

  const [validationResult, setValidationResult] = useState<{
    text: string;
    type: 'idle' | 'success' | 'error' | 'warning';
    canGeneratePdf: boolean;
    totalHours: number[];
  }>({
    text: '',
    type: 'idle',
    canGeneratePdf: false,
    totalHours: [],
  });

  // --- Effects ---
  useEffect(() => {
    // Reset state if input changes
    setValidationResult(prev => ({ 
      ...prev, 
      canGeneratePdf: false, 
      text: prev.text ? "⚠️ Alteração detectada. Valide novamente para baixar." : "",
      type: prev.text ? 'warning' : 'idle'
    }));
  }, [qtd, filial, actions, baixaDetails, abertura, fechamento, pharmacists]);

  const isStep1Done = filial.trim().length > 0;
  const isStep2Done = actions.alterarHorario || actions.baixaFarma || actions.inclusaoFarma;
  const isStep3Done = qtd > 0;
  const isEverythingUnlocked = isStep1Done && isStep2Done && isStep3Done;

  // --- Handlers ---
  const handleCopyRow = (row: ScheduleRow, setter: (val: ScheduleRow) => void) => {
    const val = row.seg;
    if (val) {
      setter({
        seg: val, ter: val, qua: val, qui: val, sex: val, sab: val, dom: val
      });
    }
  };

  const handleCopyFarmaRow = (farmaId: number, field: keyof Pharmacist, day: Day) => {
    setPharmacists(prev => prev.map(f => {
      if (f.id === farmaId) {
        const row = f[field] as ScheduleRow;
        const val = row[day];
        if (val) {
          const newRow = { seg: val, ter: val, qua: val, qui: val, sex: val, sab: val, dom: val };
          return { ...f, [field]: newRow };
        }
      }
      return f;
    }));
  };

  const updatePharmacist = (id: number, updates: Partial<Pharmacist>) => {
    setPharmacists(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  const updateFarmaSchedule = (id: number, field: 'entrada' | 'intervalo' | 'retorno' | 'saida', day: Day, val: string) => {
    setPharmacists(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, [field]: { ...f[field], [day]: val } };
      }
      return f;
    }));
  };

  const validarSemana = () => {
    let totalHours = Array(qtd).fill(0);
    let alertasCli: string[] = [];
    let avisosAmarelos: string[] = [];
    let lacunasGerais: string[] = [];

    // Transfer checks
    const transferErrors: string[] = [];
    if (actions.inclusaoFarma) {
      pharmacists.slice(0, qtd).forEach(f => {
        if (f.tipoInclusao === 'Transferido' && !f.filialOrigem.trim()) {
          transferErrors.push(`F${f.id}: Informe a Filial de Origem para inclusão por transferência.`);
        }
      });
    }

    DAYS.forEach(d => {
      const openTime = conv(abertura[d]);
      let closeTime = conv(fechamento[d]);

      if (openTime !== null && closeTime !== null) {
        if (closeTime === 0) closeTime = 1440;
        const rangeFechamento = (closeTime < openTime) ? closeTime + 1440 : closeTime;
        const minutosCobertos = new Array(rangeFechamento - openTime).fill(0);

        for (let pIdx = 0; pIdx < qtd; pIdx++) {
          const f = pharmacists[pIdx];
          const e = conv(f.entrada[d]);
          const i = conv(f.intervalo[d]);
          const r = conv(f.retorno[d]);
          let s = conv(f.saida[d]);

          if (e !== null && s !== null) {
            if (s === 0) s = 1440;
            const sEfetiva = (s < e) ? s + 1440 : s;
            const jornadaBruta = sEfetiva - e;
            const pI = (i !== null) ? i : -1;
            const pR = (r !== null) ? r : -1;

            if (i !== null && r !== null) {
              const duracaoPausa = (r < i) ? (r + 1440 - i) : (r - i);
              const tempoAteIntervalo = (i < e) ? (i + 1440 - e) : (i - e);

              if (tempoAteIntervalo < 120) {
                avisosAmarelos.push(`F${f.id} ${d.toUpperCase()}: Intervalo feito muito cedo (${fmt(tempoAteIntervalo)} de trabalho).`);
              }

              if (jornadaBruta > 360) {
                if (duracaoPausa < 60 || duracaoPausa > 120) {
                  alertasCli.push(`F${f.id} ${d.toUpperCase()}: Intervalo irregular (${duracaoPausa}min) para jornada > 6h.`);
                }
                if (tempoAteIntervalo > 360) {
                  alertasCli.push(`F${f.id} ${d.toUpperCase()}: Intervalo feito após ${fmt(tempoAteIntervalo)} de trabalho (deve ser antes de 6h).`);
                }
              } else {
                if (duracaoPausa > 15) {
                  alertasCli.push(`F${f.id} ${d.toUpperCase()}: Intervalo de ${duracaoPausa}min excede o limite de 15min para jornada < 6h.`);
                }
              }
              totalHours[pIdx] += (jornadaBruta - duracaoPausa);
            } else {
              totalHours[pIdx] += jornadaBruta;
            }

            for (let m = openTime; m < rangeFechamento; m++) {
              const mNormal = m % 1440;
              const dentroJornada = (s < e) ? (mNormal >= e || mNormal < s) : (mNormal >= e && mNormal < s);
              let dentroIntervalo = false;
              if (pI !== -1 && pR !== -1) {
                dentroIntervalo = (pR < pI) ? (mNormal >= pI || mNormal < pR) : (mNormal >= pI && mNormal < pR);
              }
              if (dentroJornada && !dentroIntervalo) minutosCobertos[m - openTime]++;
            }
          }
        }

        let inicioLacuna = -1;
        for (let m = 0; m < minutosCobertos.length; m++) {
          if (minutosCobertos[m] === 0 && inicioLacuna === -1) inicioLacuna = m + openTime;
          if (minutosCobertos[m] > 0 && inicioLacuna !== -1) {
            lacunasGerais.push(`${d.toUpperCase()}: Lacuna das ${fmt(inicioLacuna % 1440)} às ${fmt((m + openTime) % 1440)}`);
            inicioLacuna = -1;
          }
        }
        if (inicioLacuna !== -1) lacunasGerais.push(`${d.toUpperCase()}: Lacuna das ${fmt(inicioLacuna % 1440)} às ${fmt(rangeFechamento % 1440)}`);
      }
    });

    let canGenerate = transferErrors.length === 0 && lacunasGerais.length === 0 && alertasCli.length === 0;
    
    let relatorio = "RESUMO DA SEMANA:\n" + totalHours.map((h, i) => `Farma ${i + 1}: ${Math.floor(h / 60)}h${h % 60}min`).join("\n");
    
    if (!canGenerate) {
      relatorio += "\n\n⚠️ BLOQUEADO: Resolva os problemas abaixo para gerar o PDF.\n";
      if (transferErrors.length > 0) relatorio += "\nERROS DE MOVIMENTAÇÃO:\n" + transferErrors.join("\n");
      if (lacunasGerais.length > 0) relatorio += "\nLACUNAS:\n" + lacunasGerais.join("\n");
      if (alertasCli.length > 0) relatorio += "\n\nALERTAS CLT (IMPEDEM PDF):\n" + alertasCli.join("\n");
    } else {
      relatorio += "\n\n✅ COBERTURA COMPLETA E CLT OK: PDF Liberado.";
    }

    if (avisosAmarelos.length > 0) {
      relatorio += "\n\n⚠️ AVISO:\n" + avisosAmarelos.join("\n");
    }

    if (canGenerate && actions.inclusaoFarma) {
      const hasNewHiring = pharmacists.slice(0, qtd).some(f => f.tipoInclusao === 'Nova contratação');
      if (hasNewHiring) {
        setShowPopup(true);
      }
    }

    setValidationResult({
      text: relatorio,
      type: canGenerate ? (avisosAmarelos.length > 0 ? 'warning' : 'success') : 'error',
      canGeneratePdf: canGenerate,
      totalHours,
    });

    // Automatically trigger PDF generation if successful
    if (canGenerate) {
      gerarPDF();
    }
  };

  const limparTudo = () => {
    setQtd(1);
    setFilial('');
    setActions({ alterarHorario: false, baixaFarma: false, inclusaoFarma: false });
    setBaixaDetails({ nome: '', motivo: 'Desligamento', filialDestino: '' });
    setAbertura(initialScheduleRow());
    setFechamento(initialScheduleRow());
    setPharmacists(prev => prev.map(f => ({
      ...f,
      nome: '',
      cpf: '',
      tipoInclusao: 'Antigo',
      filialOrigem: '',
      entrada: initialScheduleRow(),
      intervalo: initialScheduleRow(),
      retorno: initialScheduleRow(),
      saida: initialScheduleRow(),
    })));
    setValidationResult({ text: '', type: 'idle', canGeneratePdf: false, totalHours: [] });
  };

  const gerarPDF = async () => {
    try {
      // Try to fetch the template.pdf from the public folder or root
      const response = await fetch('/template.pdf');
      if (!response.ok) {
        throw new Error("Não foi possível carregar o arquivo 'template.pdf'. Certifique-se de que ele está na pasta do projeto.");
      }
      
      const bytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const form = pdfDoc.getForm();
      // const pages = pdfDoc.getPages(); // Not needed if using form fields

      const setF = (f: string, v: string) => { 
        try { 
          const field = form.getTextField(f);
          field.setText(v || ""); 
        } catch (e) { 
          // Silently ignore if field is missing, or log for debugging
          // console.warn(`Field ${f} not found in PDF`);
        } 
      };

      // 1. Fill Filial Schedule
      DAYS.forEach(d => {
        const dayUpper = d.toUpperCase();
        setF(`${dayUpper}_A`, abertura[d]);
        setF(`${dayUpper}_S`, fechamento[d]);
      });

      // 2. Fill Pharmacists Data
      pharmacists.slice(0, qtd).forEach((f) => {
        const n = f.id;
        setF(`F${n}_NOME`, f.nome);
        setF(`F${n}_CPF`, f.cpf);
        setF(`F${n}_NASC`, f.dataNascimento);

        DAYS.forEach(d => {
          const dayUpper = d.toUpperCase();
          setF(`F${n}_${dayUpper}_E`, f.entrada[d]);
          setF(`F${n}_${dayUpper}_I`, f.intervalo[d]);
          setF(`F${n}_${dayUpper}_R`, f.retorno[d]);
          setF(`F${n}_${dayUpper}_S`, f.saida[d]);
        });
      });

      const finalBytes = await pdfDoc.save();
      const blob = new Blob([finalBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Escala_${filial || 'Filial'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      alert("Download concluído! Cheque sua aba de downloads.");
      if (confirm("Assinaturas necessárias!! \n\nDirecionar para o site GOV?")) {
        window.open("https://www.gov.br/pt-br/servicos/assinatura-eletronica?origem=maisacessado_home", "_blank");
      }
    } catch (err) {
      alert("Erro ao gerar PDF: " + (err as Error).message);
    }
  };

  // --- Render Helpers ---
  const renderScheduleInputs = (label: string, row: ScheduleRow, setter: (val: ScheduleRow) => void) => (
    <tr key={label}>
      <td className="ph-title text-left pl-2.5 font-semibold">{label}</td>
      {DAYS.map(d => (
        <td key={d}>
          <input 
            type="time" 
            value={row[d]} 
            onChange={e => setter({ ...row, [d]: e.target.value })}
            className="w-[92%]"
          />
        </td>
      ))}
      <td className="w-[45px]">
        <button 
          onClick={() => handleCopyRow(row, setter)}
          className="p-1 px-2 cursor-pointer bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          title="Copiar primeira coluna para todas"
        >
          <ClipboardCopy size={16} />
        </button>
      </td>
    </tr>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 font-sans text-slate-100 antialiased overflow-hidden">
      <div className="relative w-full h-full max-w-[1240px] max-h-[920px] glass-panel rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-700">
        
        {/* Header - Centered Filial */}
        <header className="flex flex-col items-center justify-center p-2 border-b border-white/10 shrink-0 bg-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-light tracking-widest text-white uppercase opacity-80">Validador Semanal de Horários</h1>
          </div>
          
          <div className="flex items-center gap-4 bg-indigo-500/10 p-2 px-8 rounded-2xl border border-indigo-400/30 shadow-indigo-500/10 shadow-xl">
            <span className="text-xs font-black uppercase text-indigo-300 tracking-tighter">Filial:</span>
            <input 
              type="text" 
              placeholder="Identificação da Filial"
              value={filial} 
              onChange={e => setFilial(e.target.value)}
              className="bg-transparent border-b-2 border-indigo-400 text-lg py-0.5 px-3 focus:outline-none focus:border-white w-72 text-center text-white font-black"
            />
          </div>
        </header>

        {/* Global Controls & Actions - Reordered Step 2 & 3 */}
        <section className={`p-4 grid grid-cols-12 gap-6 shrink-0 border-b border-white/10 transition-all ${!isStep1Done ? 'locked-section' : 'unlocked-section'}`}>
          
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
               Ações Desejadas
            </p>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-5 h-5 rounded-lg border-2 border-white/20 flex items-center justify-center transition-all ${actions.alterarHorario ? 'bg-indigo-500 border-indigo-400 shadow-lg shadow-indigo-500/50' : 'bg-white/5 group-hover:border-white/40'}`}>
                  {actions.alterarHorario && <CheckCircle size={14} className="text-white" />}
                  <input 
                    type="checkbox" 
                    checked={actions.alterarHorario} 
                    onChange={e => setActions(prev => ({ ...prev, alterarHorario: e.target.checked }))}
                    className="hidden" 
                  />
                </div>
                <span className={`text-[11px] font-bold uppercase transition-colors ${actions.alterarHorario ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>Alterar horário</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-5 h-5 rounded-lg border-2 border-white/20 flex items-center justify-center transition-all ${actions.baixaFarma ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/50' : 'bg-white/5 group-hover:border-white/40'}`}>
                  {actions.baixaFarma && <CheckCircle size={14} className="text-white" />}
                  <input 
                    type="checkbox" 
                    checked={actions.baixaFarma} 
                    onChange={e => setActions(prev => ({ ...prev, baixaFarma: e.target.checked }))}
                    className="hidden" 
                  />
                </div>
                <span className={`text-[11px] font-bold uppercase transition-colors ${actions.baixaFarma ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>Baixa de farmacêutico</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-5 h-5 rounded-lg border-2 border-white/20 flex items-center justify-center transition-all ${actions.inclusaoFarma ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/50' : 'bg-white/5 group-hover:border-white/40'}`}>
                  {actions.inclusaoFarma && <CheckCircle size={14} className="text-white" />}
                  <input 
                    type="checkbox" 
                    checked={actions.inclusaoFarma} 
                    onChange={e => setActions(prev => ({ ...prev, inclusaoFarma: e.target.checked }))}
                    className="hidden" 
                  />
                </div>
                <span className={`text-[11px] font-bold uppercase transition-colors ${actions.inclusaoFarma ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>Inclusão de farmacêutico</span>
              </label>
            </div>
          </div>

          <div className={`col-span-12 lg:col-span-3 flex flex-col gap-3 border-l border-white/10 pl-6 transition-all ${!isStep2Done ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">
               Quantidade de farmacêuticos na filial
            </p>
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-2 hover:bg-white/10 transition-colors">
              <select 
                value={qtd} 
                onChange={e => setQtd(Number(e.target.value))}
                className="bg-transparent text-lg font-bold outline-none border-none p-0 cursor-pointer text-white w-full"
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n} className="bg-[#1e1b4b]">{n}</option>)}
              </select>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 flex flex-col gap-3 border-l border-white/10 pl-6">
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
               Formulário de Movimentação
            </p>
            
            <AnimatePresence mode="wait">
              {actions.baixaFarma ? (
                <motion.div 
                  key="baixa-form"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="bg-red-500/5 p-3 rounded-xl border border-red-500/20 space-y-3"
                >
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <UserMinus size={14} /> Formulário de baixa
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] uppercase opacity-60 font-bold">Farma a ser baixado</label>
                      <input 
                        type="text" 
                        value={baixaDetails.nome} 
                        onChange={e => setBaixaDetails(p => ({ ...p, nome: e.target.value }))}
                        className="bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs focus:bg-white/10 outline-none focus:border-red-500/50"
                        placeholder="Nome Completo"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] uppercase opacity-60 font-bold">Motivo</label>
                      <select 
                        value={baixaDetails.motivo}
                        onChange={e => setBaixaDetails(p => ({ ...p, motivo: e.target.value as any }))}
                        className="bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs outline-none text-slate-200"
                      >
                        <option value="Desligamento" className="bg-[#0f172a]">Desligamento</option>
                        <option value="Transferência" className="bg-[#0f172a]">Transferência</option>
                      </select>
                    </div>
                  </div>
                  {baixaDetails.motivo === 'Transferência' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="flex flex-col gap-1.5 pt-2"
                    >
                      <label className="text-[8px] uppercase opacity-60 font-bold">Filial Destino</label>
                      <input 
                        type="text" 
                        value={baixaDetails.filialDestino} 
                        onChange={e => setBaixaDetails(p => ({ ...p, filialDestino: e.target.value }))}
                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-red-500"
                        placeholder="Número ou Nome da Filial"
                      />
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <div className="h-[90px] flex items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/10">
                  <p className="text-[10px] text-slate-500 italic">Informações de baixa serão solicitadas aqui</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Schedule Table Area */}
        <div className={`flex-1 p-4 overflow-hidden flex flex-col transition-all ${!isEverythingUnlocked ? 'locked-section blur-sm' : 'unlocked-section'}`}>
          <div className="flex-1 w-full border border-white/10 rounded-2xl overflow-hidden bg-black/30 flex flex-col shadow-2xl">
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left text-[11px] border-collapse min-w-[1000px] table-fixed">
                <thead className="bg-white/10 text-indigo-200 sticky top-0 uppercase tracking-tighter z-10 backdrop-blur-md">
                  <tr>
                    <th colSpan={2} className="p-4 w-[280px] border-r border-white/5 font-black text-[10px]">Informações / Período</th>
                    {DAYS.map(day => <th key={day} className="p-2 text-center border-r border-white/5 font-black text-[10px] w-[100px]">{day.toUpperCase()}</th>)}
                    <th className="p-4 text-center w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* Store Status Rows */}
                  <tr className="bg-indigo-500/5 group border-b-2 border-indigo-500/20">
                    <td colSpan={2} className="p-4 border-r border-white/5 w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-indigo-500 rounded-full"></div>
                        <div>
                          <p className="font-black text-white text-xs uppercase tracking-tighter">Abertura Filial</p>
                          <p className="text-[9px] text-indigo-300/60 uppercase font-black">Horário da Loja</p>
                        </div>
                      </div>
                    </td>
                    {DAYS.map(d => (
                      <td key={d} className="p-3 w-[100px]">
                        <input 
                          type="time" 
                          value={abertura[d]} 
                          onChange={e => setAbertura({ ...abertura, [d]: e.target.value })}
                          className="bg-white/5 border border-white/10 rounded-lg w-full text-center py-2 focus:bg-indigo-500/10 outline-none text-white font-bold text-sm shadow-inner focus:border-indigo-500/50 transition-all"
                        />
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      <button onClick={() => handleCopyRow(abertura, setAbertura)} className="p-2 bg-white/5 hover:bg-white/15 rounded-xl text-slate-400 transition-all active:scale-90"><ClipboardCopy size={16} /></button>
                    </td>
                  </tr>
                  <tr className="bg-indigo-500/5 group border-b-2 border-indigo-500/20">
                    <td colSpan={2} className="p-4 border-r border-white/5 w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-indigo-500 rounded-full"></div>
                        <div>
                          <p className="font-black text-white text-xs uppercase tracking-tighter">Fechamento Filial</p>
                          <p className="text-[9px] text-indigo-300/60 uppercase font-black">Horário da Loja</p>
                        </div>
                      </div>
                    </td>
                    {DAYS.map(d => (
                      <td key={d} className="p-3 w-[100px]">
                        <input 
                          type="time" 
                          value={fechamento[d]} 
                          onChange={e => setFechamento({ ...fechamento, [d]: e.target.value })}
                          className="bg-white/5 border border-white/10 rounded-lg w-full text-center py-2 focus:bg-indigo-500/10 outline-none text-white font-bold text-sm shadow-inner focus:border-indigo-500/50 transition-all"
                        />
                      </td>
                    ))}
                    <td className="p-3 text-center">
                      <button onClick={() => handleCopyRow(fechamento, setFechamento)} className="p-2 bg-white/5 hover:bg-white/15 rounded-xl text-slate-400 transition-all active:scale-90"><ClipboardCopy size={16} /></button>
                    </td>
                  </tr>

                  {/* Pharmacists Rows - Restructured for direct alignment */}
                  {pharmacists.slice(0, qtd).map((f) => {
                    const rowConfigs = [
                      { field: 'entrada' as const, label: 'Entrada' },
                      { field: 'intervalo' as const, label: 'Intervalo' },
                      { field: 'retorno' as const, label: 'Retorno do Intervalo' },
                      { field: 'saida' as const, label: 'Saída' }
                    ];

                    return (
                      <React.Fragment key={f.id}>
                        {rowConfigs.map((config, idx) => (
                          <tr key={`${f.id}-${config.field}`} className="bg-indigo-500/[0.03] group/row border-b border-white/5 last:border-b-2">
                            {idx === 0 && (
                              <td rowSpan={4} className="p-3 align-top border-r border-white/5 bg-indigo-500/[0.08] w-[180px]">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-black text-indigo-400 border border-white/10 text-[10px]">F{f.id}</div>
                                    <div className="flex-1 min-w-0">
                                      <input 
                                        type="text" 
                                        placeholder="Nome"
                                        value={f.nome} 
                                        onChange={e => updatePharmacist(f.id, { nome: e.target.value })}
                                        className="bg-transparent border-b border-white/10 text-white outline-none focus:border-indigo-400 py-0.5 font-bold text-[11px] w-full truncate"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    <div className="flex flex-col">
                                      <label className="text-[8px] uppercase font-bold text-slate-500">CPF:</label>
                                      <input 
                                        type="text" 
                                        value={f.cpf} 
                                        onChange={e => updatePharmacist(f.id, { cpf: e.target.value })}
                                        className="bg-black/40 border border-white/5 rounded-md px-2 py-0.5 text-[10px] text-indigo-100 outline-none"
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-[8px] uppercase font-bold text-slate-500">Nascimento:</label>
                                      <input 
                                        type="text" 
                                        value={f.dataNascimento} 
                                        onChange={e => updatePharmacist(f.id, { dataNascimento: e.target.value })}
                                        className="bg-black/40 border border-white/5 rounded-md px-2 py-0.5 text-[10px] text-indigo-100 outline-none"
                                      />
                                    </div>
                                  </div>

                                  {actions.inclusaoFarma && (
                                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                                      <select 
                                        value={f.tipoInclusao}
                                        onChange={e => updatePharmacist(f.id, { tipoInclusao: e.target.value as any })}
                                        className="bg-emerald-500/10 border border-white/10 rounded-md text-[9px] py-1 px-1.5 outline-none font-bold w-full"
                                      >
                                        <option value="Já vinculado" className="bg-[#0f172a]">Já vinculado</option>
                                        <option value="Nova contratação" className="bg-[#0f172a]">Nova Contratação</option>
                                        <option value="Transferido" className="bg-[#0f172a]">Transferido</option>
                                      </select>
                                      {f.tipoInclusao === 'Transferido' && (
                                        <input 
                                          type="text" 
                                          placeholder="Origem"
                                          value={f.filialOrigem} 
                                          onChange={e => updatePharmacist(f.id, { filialOrigem: e.target.value })}
                                          className="bg-white/5 border border-white/5 rounded-md px-2 py-1 text-[9px] outline-none w-full"
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="p-3 w-[100px] text-[9px] uppercase font-black text-slate-500 border-r border-white/5 bg-indigo-500/[0.02] group-hover/row:text-indigo-300 transition-colors leading-tight min-w-[100px]">
                              {config.label}
                            </td>
                            {DAYS.map(d => (
                              <td key={d} className="p-2 border-r border-white/5 w-[100px]">
                                <input 
                                  type="time" 
                                  value={f[config.field][d] as string} 
                                  onChange={e => updateFarmaSchedule(f.id, config.field, d, e.target.value)}
                                  className="bg-white/5 border border-white/10 rounded-lg w-full text-center py-2 outline-none text-slate-100 focus:text-white focus:bg-indigo-500/20 font-bold transition-all text-sm"
                                />
                              </td>
                            ))}
                            <td className="p-2 text-center w-14">
                              <button onClick={() => handleCopyFarmaRow(f.id, config.field, 'seg')} className="p-2 bg-white/5 hover:bg-indigo-500/20 rounded-xl text-slate-500 hover:text-white transition-all"><ClipboardCopy size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer / Legends */}
            <div className="shrink-0 p-3 flex items-center justify-between bg-black/40 border-t border-white/10">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-tighter">Conformidade CLT</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-tighter">Escala Validada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-[10px] text-red-400 uppercase font-bold tracking-tighter">Lacunas de Cobertura</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-500 italic flex items-center gap-1">
                <AlertCircle size={10} /> Preencha todos os campos obrigatórios para liberar o PDF
              </span>
            </div>
          </div>
        </div>

        {/* Summary & Results Footer */}
        <section className="p-4 flex gap-4 border-t border-white/10 bg-white/5 shrink-0">
          <div className={`flex-1 rounded-xl p-4 border font-mono text-[11px] h-32 overflow-auto custom-scrollbar transition-all ${
            validationResult.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
            validationResult.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
            validationResult.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' :
            'bg-black/40 border-white/5 text-slate-400'
          }`}>
            <div className="mb-2 font-bold flex items-center gap-2 text-white">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div> RESUMO DO PROCESSAMENTO:
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">
              {validationResult.text || "> Aguardando dados de entrada..."}
            </div>
          </div>

          <div className="flex flex-col gap-3 w-72">
            <button 
              onClick={validarSemana}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle size={14} />
              Validar Escala
            </button>
            <button 
              disabled={!validationResult.canGeneratePdf}
              onClick={gerarPDF}
              className={`text-xs font-bold py-3 rounded-lg border transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                validationResult.canGeneratePdf 
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-xl' 
                  : 'bg-black/20 text-slate-600 border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              <FileDown size={14} className={validationResult.canGeneratePdf ? "text-indigo-400" : ""} />
              Gerar PDF Preenchido
            </button>
          </div>
        </section>
      </div>

      {/* Nova Contratação Popup */}
      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full glass-panel rounded-3xl p-8 border-2 border-indigo-400/30 shadow-2xl space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-indigo-500 rounded-2xl mx-auto flex items-center justify-center animate-bounce">
                <AlertCircle size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-tight">Aviso de Inclusão Profissional</h2>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm font-bold text-indigo-200 uppercase leading-relaxed tracking-wide">
                  NECESSÁRIO ENVIO DA CARTEIRA DE TRABALHO DIGITAL E CONTRATO INTERNO DO FARMACÊUTICO CONTRATADO
                </p>
              </div>
              <button 
                onClick={() => setShowPopup(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/40 uppercase tracking-widest text-xs"
              >
                Eu compreendo e irei enviar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Background Decorative Blurs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
    </div>
  );

  function renderFarmaSubRow(f: Pharmacist, field: 'entrada' | 'intervalo' | 'retorno' | 'saida', label: string) {
    return (
      <tr key={`${f.id}-${field}`}>
        <td className="ph-title text-left pl-4 text-xs opacity-80">{label} (F{f.id})</td>
        {DAYS.map(d => (
          <td key={d}>
            <input 
              type="time" 
              value={f[field][d]} 
              onChange={e => updateFarmaSchedule(f.id, field, d, e.target.value)}
              className="w-[92%]"
            />
          </td>
        ))}
        <td>
          <button 
            onClick={() => handleCopyFarmaRow(f.id, field, 'seg')}
            className="p-1 px-2 cursor-pointer bg-white/5 rounded-lg hover:bg-white/15 transition-colors"
          >
            <ClipboardCopy size={14} />
          </button>
        </td>
      </tr>
    );
  }
}
