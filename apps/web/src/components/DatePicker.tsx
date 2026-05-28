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
  // Always ISO "YYYY-MM-DD" (or empty string).
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

// 1–2 digit day/month, 2 or 4 digit year, separator `/` or `-` and the same
// separator on both sides (the `\2` backref enforces that).
const RE_WITH_SEP = /^(\d{1,2})([/-])(\d{1,2})\2(\d{2}|\d{4})$/;
const RE_DIGITS_6 = /^(\d{2})(\d{2})(\d{2})$/;
const RE_DIGITS_8 = /^(\d{2})(\d{2})(\d{4})$/;

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const parsed = parse(iso, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

function dateToIso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function extractParts(
  input: string,
): { day: string; month: string; year: string } | undefined {
  const mSep = RE_WITH_SEP.exec(input);
  if (mSep && mSep[1] && mSep[3] && mSep[4]) {
    return { day: mSep[1], month: mSep[3], year: mSep[4] };
  }
  const m8 = RE_DIGITS_8.exec(input);
  if (m8 && m8[1] && m8[2] && m8[3]) {
    return { day: m8[1], month: m8[2], year: m8[3] };
  }
  const m6 = RE_DIGITS_6.exec(input);
  if (m6 && m6[1] && m6[2] && m6[3]) {
    return { day: m6[1], month: m6[2], year: m6[3] };
  }
  return undefined;
}

function tryParseDisplay(input: string): Date | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const parts = extractParts(trimmed);
  if (!parts) return undefined;

  // Two-digit years always expand to 20yy.
  const yyyy = parts.year.length === 2 ? `20${parts.year}` : parts.year;
  const yearNum = Number.parseInt(yyyy, 10);
  if (yearNum < MIN_YEAR || yearNum > MAX_YEAR) return undefined;

  const canonical = `${parts.day.padStart(2, '0')}/${parts.month.padStart(2, '0')}/${yyyy}`;
  const parsed = parse(canonical, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : undefined;
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

  // Sync with the external `value` only when the input is NOT focused,
  // otherwise we'd overwrite a partial value the user is still typing.
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
    // Partial input that doesn't parse cleanly → don't call onChange; the
    // form `value` stays as-is while the local text follows what's typed.
  }

  function handleBlur() {
    setFocused(false);
    // Resync with the canonical form of `value`. If the user left an invalid
    // partial behind, the text snaps back to the last valid value (or empty).
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
