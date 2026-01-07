'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
const PRESETS = [
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: 'last7', label: '過去7日' },
  { key: 'last30', label: '過去30日' },
  { key: 'thisMonth', label: '今月' },
  { key: 'lastMonth', label: '昨月' },
] as const;

type PresetKey = (typeof PRESETS)[number]['key'];

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatDate(date: Date | undefined): string {
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPresetRange(key: PresetKey): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (key) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const day = new Date(today);
      day.setDate(day.getDate() - 1);
      return { from: day, to: day };
    }
    case 'last7': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: today };
    }
    case 'last30': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from, to: today };
    }
    case 'thisMonth': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to: today };
    }
    case 'lastMonth': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from, to };
    }
    default:
      return { from: today, to: today };
  }
}

export function DateRangePicker({ startDate, endDate }: DateRangePickerProps) {
  const initialRange: DateRange = useMemo(
    () => ({ from: parseDate(startDate), to: parseDate(endDate) }),
    [startDate, endDate]
  );

  const [range, setRange] = useState<DateRange | undefined>(initialRange);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRange(initialRange);
  }, [initialRange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const applyPreset = (key: PresetKey) => {
    setRange(getPresetRange(key));
  };

  const currentLabel = useMemo(() => {
    if (!range?.from || !range?.to) {
      return '期間未選択';
    }

    return `${formatDate(range.from)} 〜 ${formatDate(range.to)}`;
  }, [range]);

  return (
    <div className="flex w-full flex-col gap-3" ref={containerRef}>
      <input type="hidden" name="startDate" value={formatDate(range?.from)} readOnly />
      <input type="hidden" name="endDate" value={formatDate(range?.to)} readOnly />

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => applyPreset(preset.key)}
            className="rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            'w-full justify-start text-left font-normal',
            !range?.from || !range?.to ? 'text-muted-foreground' : ''
          )}
        >
          {currentLabel}
        </Button>
        {open ? (
          <div className="absolute z-10 mt-2 border border-neutral-200 bg-white p-2 shadow-lg">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={range}
              onSelect={(value) => setRange(value ?? undefined)}
              defaultMonth={range?.from}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
