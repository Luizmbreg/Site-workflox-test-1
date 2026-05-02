import React from 'react';
import { CheckCircle, AlertCircle, UserMinus, UserPlus, Clock } from 'lucide-react';

// --- Types ---
type Day = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';
const DAYS: Day[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const DAY_LABELS: Record<Day, string> = {
  seg: 'Seg',
  ter: 'Ter',
  qua: 'Qua',
  qui: 'Qui',
  sex: 'Sex',
  sab: 'Sáb',
  dom: 'Dom'
};

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
  crf: string;
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

// --- ActionCheckboxes Component ---
interface ActionCheckboxesProps {
  actions: Actions;
  setActions: React.Dispatch<React.SetStateAction<Actions>>;
}

export const ActionCheckboxes = ({ actions, setActions }: ActionCheckboxesProps) => {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={actions.alterarHorario}
          onChange={(e) => setActions({ ...actions, alterarHorario: e.target.checked })}
          className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-indigo-500 checked:border-indigo-500 cursor-pointer"
        />
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-indigo-400" />
          <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
            Alteração de Horário
          </span>
        </div>
      </label>

      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={actions.inclusaoFarma}
          onChange={(e) => setActions({ ...actions, inclusaoFarma: e.target.checked })}
          className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-green-500 checked:border-green-500 cursor-pointer"
        />
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="text-green-400" />
          <span className="text-sm font-semibold text-white group-hover:text-green-300 transition-colors">
            Inclusão de Farmacêutico
          </span>
        </div>
      </label>

      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={actions.baixaFarma}
          onChange={(e) => setActions({ ...actions, baixaFarma: e.target.checked })}
          className="w-5 h-5 rounded border-2 border-white/20 bg-white/5 checked:bg-red-500 checked:border-red-500 cursor-pointer"
        />
        <div className="flex items-center gap-2">
          <UserMinus size={18} className="text-red-400" />
          <span className="text-sm font-semibold text-white group-hover:text-red-300 transition-colors">
            Baixa de Farmacêutico
          </span>
        </div>
      </label>
    </div>
  );
};

// --- BaixaForm Component ---
interface BaixaFormProps {
  baixaDetails: BaixaDetails;
  setBaixaDetails: React.Dispatch<React.SetStateAction<BaixaDetails>>;
}

export const BaixaForm = ({ baixaDetails, setBaixaDetails }: BaixaFormProps) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
          Nome do Farmacêutico
        </label>
        <input
          type="text"
          value={baixaDetails.nome}
          onChange={(e) => setBaixaDetails({ ...baixaDetails, nome: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          placeholder="Digite o nome completo"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
          Motivo da Baixa
        </label>
        <select
          value={baixaDetails.motivo}
          onChange={(e) => setBaixaDetails({ ...baixaDetails, motivo: e.target.value as 'Desligamento' | 'Transferência' })}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          <option value="Desligamento">Desligamento</option>
          <option value="Transferência">Transferência</option>
        </select>
      </div>

      {baixaDetails.motivo === 'Transferência' && (
        <div>
          <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
            Filial de Destino
          </label>
          <input
            type="text"
            value={baixaDetails.filialDestino}
            onChange={(e) => setBaixaDetails({ ...baixaDetails, filialDestino: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            placeholder="Ex: Filial 123"
          />
        </div>
      )}
    </div>
  );
};

// --- MobileFarmaInfo Component ---
interface MobileFarmaInfoProps {
  f: Pharmacist;
  fIdx: number;
  actions: Actions;
  isFarmaNomeOk: (idx: number) => boolean;
  isFarmaCpfNascOk: (idx: number) => boolean;
  updatePharmacist: (id: number, updates: Partial<Pharmacist>) => void;
}

export const MobileFarmaInfo = ({
  f,
  fIdx,
  actions,
  isFarmaNomeOk,
  isFarmaCpfNascOk,
  updatePharmacist
}: MobileFarmaInfoProps) => {
  const nomeUnlocked = isFarmaNomeOk(fIdx);
  const cpfNascUnlocked = isFarmaCpfNascOk(fIdx);

  return (
    <div className="space-y-4">
      {/* Nome */}
      <div>
        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
          Nome Completo
        </label>
        <div className="relative">
          <input
            type="text"
            value={f.nome}
            onChange={(e) => updatePharmacist(f.id, { nome: e.target.value })}
            disabled={!nomeUnlocked}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            placeholder="Digite o nome do farmacêutico"
          />
          {nomeUnlocked && f.nome && (
            <CheckCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
          )}
        </div>
      </div>

      {/* CPF */}
      <div>
        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
          CPF
        </label>
        <div className="relative">
          <input
            type="text"
            value={f.cpf}
            onChange={(e) => updatePharmacist(f.id, { cpf: e.target.value })}
            disabled={!cpfNascUnlocked}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            placeholder="000.000.000-00"
            maxLength={14}
          />
          {cpfNascUnlocked && f.cpf && (
            <CheckCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
          )}
        </div>
      </div>

      {/* CRF */}
      <div>
        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
          CRF
        </label>
        <div className="relative">
          <input
            type="text"
            value={f.crf}
            onChange={(e) => updatePharmacist(f.id, { crf: e.target.value })}
            disabled={!cpfNascUnlocked}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            placeholder="Digite o CRF"
          />
          {cpfNascUnlocked && f.crf && (
            <CheckCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
          )}
        </div>
      </div>

      {/* Data de Nascimento */}
      <div>
        <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
          Data de Nascimento
        </label>
        <div className="relative">
          <input
            type="date"
            value={f.dataNascimento}
            onChange={(e) => updatePharmacist(f.id, { dataNascimento: e.target.value })}
            disabled={!cpfNascUnlocked}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {cpfNascUnlocked && f.dataNascimento && (
            <CheckCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
          )}
        </div>
      </div>

      {/* Tipo de Inclusão */}
      {actions.inclusaoFarma && (
        <>
          <div>
            <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
              Tipo de Inclusão
            </label>
            <select
              value={f.tipoInclusao}
              onChange={(e) => updatePharmacist(f.id, { tipoInclusao: e.target.value as Pharmacist['tipoInclusao'] })}
              disabled={!nomeUnlocked}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="Já vinculado">Já vinculado</option>
              <option value="Nova contratação">Nova contratação</option>
              <option value="Transferido">Transferido</option>
            </select>
          </div>

          {f.tipoInclusao === 'Transferido' && (
            <div>
              <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">
                Filial de Origem
              </label>
              <input
                type="text"
                value={f.filialOrigem}
                onChange={(e) => updatePharmacist(f.id, { filialOrigem: e.target.value })}
                disabled={!nomeUnlocked}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Ex: Filial 123"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- MobileScheduleDay Component ---
interface MobileScheduleDayProps {
  f: Pharmacist;
  fIdx: number;
  isFarmaScheduleOk: (idx: number) => boolean;
  updateFarmaSchedule: (
    id: number,
    field: 'entrada' | 'intervalo' | 'retorno' | 'saida',
    day: Day,
    val: string
  ) => void;
}

export const MobileScheduleDay = ({
  f,
  fIdx,
  isFarmaScheduleOk,
  updateFarmaSchedule
}: MobileScheduleDayProps) => {
  const schedUnlocked = isFarmaScheduleOk(fIdx);

  const scheduleFields: Array<{ field: 'entrada' | 'intervalo' | 'retorno' | 'saida'; label: string }> = [
    { field: 'entrada', label: 'Entrada' },
    { field: 'intervalo', label: 'Intervalo' },
    { field: 'retorno', label: 'Retorno' },
    { field: 'saida', label: 'Saída' }
  ];

  return (
    <div className="space-y-4">
      {scheduleFields.map(({ field, label }) => (
        <div key={field}>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            {label}
          </label>
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day) => (
              <div key={day} className="flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase text-center">
                  {DAY_LABELS[day]}
                </span>
                <input
                  type="time"
                  value={f[field][day]}
                  onChange={(e) => updateFarmaSchedule(f.id, field, day, e.target.value)}
                  disabled={!schedUnlocked}
                  className="w-full px-1 py-2 text-xs rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
