'use client';

import { useEffect, useState } from 'react';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  // Sempre ISO "YYYY-MM-DD" (ou string vazia).
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const DISPLAY_FORMATS_FULL = ['dd/MM/yyyy', 'dd-MM-yyyy'];
const DISPLAY_FORMATS_SHORT = ['dd/MM/yy', 'dd-MM-yy'];
const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const parsed = parse(iso, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

function dateToIso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

// Aceita strings com 10 caracteres (ano completo) ou 8 caracteres (ano de 2
// dígitos, sempre interpretado como 20yy). A guard de comprimento evita
// parses indesejados enquanto o usuário ainda digita.
function tryParseDisplay(input: string): Date | undefined {
  const formats =
    input.length === 10
      ? DISPLAY_FORMATS_FULL
      : input.length === 8
        ? DISPLAY_FORMATS_SHORT
        : null;
  if (!formats) return undefined;
  for (const fmt of formats) {
    const parsed = parse(input, fmt, new Date());
    if (!isValid(parsed)) continue;
    let year = parsed.getFullYear();
    // date-fns 3 já interpreta `yy` numa janela próxima do ano atual; aqui
    // forçamos a regra "sempre 20yy" definida na spec 004 — para input de 8
    // caracteres, extrai os 2 dígitos do ano e reconstrói com 2000+yy.
    if (input.length === 8) {
      const yy = Number.parseInt(input.slice(6, 8), 10);
      if (Number.isNaN(yy)) continue;
      year = 2000 + yy;
      parsed.setFullYear(year);
    }
    if (year < MIN_YEAR || year > MAX_YEAR) continue;
    return parsed;
  }
  return undefined;
}

function displayValue(iso: string): string {
  const d = isoToDate(iso);
  return d ? format(d, 'dd/MM/yyyy') : '';
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => displayValue(value));
  const [focused, setFocused] = useState(false);

  // Sincroniza com `value` externo apenas quando o input NÃO está focado.
  // Senão sobrescreveria o texto que o usuário está digitando ainda parcial.
  useEffect(() => {
    if (!focused) setText(displayValue(value));
  }, [value, focused]);

  const selected = isoToDate(value);

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setText(next);

    if (next === '') {
      onChange('');
      return;
    }

    const parsed = tryParseDisplay(next);
    if (parsed) {
      onChange(dateToIso(parsed));
    }
    // Input parcial sem parse válido → não chama onChange; o `value` no form
    // permanece como estava. Texto local segue a digitação.
  }

  function handleBlur() {
    setFocused(false);
    // Ressincroniza com a forma canônica do value. Se o usuário deixou um
    // parcial inválido, o texto volta para o último value válido (ou vazio).
    setText(displayValue(value));
  }

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder ?? 'dd/mm/aaaa'}
        value={text}
        onChange={handleTextChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        disabled={disabled}
        className="pr-10"
        autoComplete="off"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            tabIndex={-1}
            aria-label="Abrir calendário"
            className="absolute right-0 top-0 h-full px-2 text-muted-foreground hover:text-foreground"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                onChange(dateToIso(d));
                setText(format(d, 'dd/MM/yyyy'));
                setOpen(false);
              }
            }}
            locale={ptBR}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
