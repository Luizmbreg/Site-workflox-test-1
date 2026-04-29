// ← FORA do App, antes da declaração `export default function App()`

interface MobileFarmaInfoProps {
  f: Pharmacist;
  fIdx: number;
  actions: Actions;
  isFarmaNomeOk: (idx: number) => boolean;
  isFarmaCpfNascOk: (idx: number) => boolean;
  updatePharmacist: (id: number, updates: Partial<Pharmacist>) => void;
}

const MobileFarmaInfo = ({
  f, fIdx, actions, isFarmaNomeOk, isFarmaCpfNascOk, updatePharmacist
}: MobileFarmaInfoProps) => {
  const nomeUnlocked = isFarmaNomeOk(fIdx);
  const cpfNascUnlocked = isFarmaCpfNascOk(fIdx);
  return (
    // ... mesmo JSX de antes, sem alterações
  );
};

interface MobileScheduleDayProps {
  f: Pharmacist;
  fIdx: number;
  isFarmaScheduleOk: (idx: number) => boolean;
  updateFarmaSchedule: (id: number, field: 'entrada' | 'intervalo' | 'retorno' | 'saida', day: Day, val: string) => void;
}

const MobileScheduleDay = ({
  f, fIdx, isFarmaScheduleOk, updateFarmaSchedule
}: MobileScheduleDayProps) => {
  const schedUnlocked = isFarmaScheduleOk(fIdx);
  return (
    // ... mesmo JSX de antes, sem alterações
  );
};
