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

// Formatos aceitos no input por teclado.
const DISPLAY_FORMATS = ['dd/MM/yyyy', 'dd-MM-yyyy'];

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const parsed = parse(iso, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

function dateToIso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function tryParseDisplay(input: string): Date | undefined {
  for (const fmt of DISPLAY_FORMATS) {
    const parsed = parse(input, fmt, new Date());
    if (isValid(parsed)) return parsed;
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

  // Re-sincroniza o texto quando `value` muda externamente (ex: reset do form,
  // ou seleção via calendário com Popover já aberto).
  useEffect(() => {
    setText(displayValue(value));
  }, [value]);

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
    // Input parcial sem parse válido → mantém value anterior; o text local
    // segue o que o usuário digitou.
  }

  function handleBlur() {
    // Ao sair do input, ressincroniza texto com a forma canônica.
    // Se o usuário digitou algo inválido, restaura o último value.
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
