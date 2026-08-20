"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { isTargetDay } from "@/lib/streak";
import type { CheckInStatus, Frequency } from "@/lib/types/database";

export type DayEntry = {
  id: string;
  nickname: string;
  time: string;
  status: CheckInStatus;
  memo: string | null;
  photoUrl: string | null;
};

type Props = {
  year: number;
  month: number;
  today: string;
  leadingBlanks: number;
  calendarCells: { day: number; date: string }[];
  successDates: string[];
  entriesByDate: Record<string, DayEntry[]>;
  frequency: Frequency;
  frequencyDays: number[] | null;
};

export default function CalendarGrid({
  year,
  month,
  today,
  leadingBlanks,
  calendarCells,
  successDates,
  entriesByDate,
  frequency,
  frequencyDays,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const successSet = new Set(successDates);

  const selectedEntries = selectedDate ? entriesByDate[selectedDate] ?? [] : [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted">
          {year}년 {month}월
        </h2>
        <span className="text-xs text-ink-muted">성공한 날 ♥</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink-muted">
        {["일", "월", "화", "수", "목", "금", "토"].map((label) => (
          <div key={label} className="pb-1">
            {label}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {calendarCells.map(({ day, date }) => {
          const isSuccess = successSet.has(date);
          const isFuture = date > today;
          const isToday = date === today;
          const isTarget = isTargetDay(date, frequency, frequencyDays);
          const hasEntries = (entriesByDate[date]?.length ?? 0) > 0;
          const isSelected = selectedDate === date;

          return (
            <button
              key={date}
              type="button"
              disabled={isFuture}
              onClick={() => setSelectedDate((prev) => (prev === date ? null : date))}
              className={cn(
                "flex aspect-square items-center justify-center rounded-full text-xs font-bold transition disabled:cursor-default",
                isSuccess && "bg-coral text-white",
                !isSuccess && !isFuture && isTarget && "bg-coral-soft/60 text-ink-muted",
                !isSuccess && !isFuture && !isTarget && "text-border",
                isFuture && "text-border",
                isToday && !isSuccess && "border-2 border-coral",
                isSelected && "ring-2 ring-plum ring-offset-1",
                hasEntries && !isFuture && "cursor-pointer"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 rounded-xl bg-bg p-3">
          <div className="mb-2 text-xs font-bold text-plum dark:text-white">{selectedDate}</div>
          {selectedEntries.length === 0 ? (
            <p className="text-xs text-ink-muted">이 날은 인증 기록이 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {selectedEntries.map((entry) => (
                <li key={entry.id}>
                  <div className="text-xs font-bold">
                    {entry.nickname} · {entry.time}
                  </div>
                  {entry.status === "failed" ? (
                    <div className="mt-1 text-xs font-bold text-ink-muted">오늘은 실패했어요</div>
                  ) : (
                    <>
                      {entry.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.photoUrl}
                          alt="인증 사진"
                          className="mt-1 h-32 w-full rounded-lg object-cover"
                        />
                      )}
                      {entry.memo && (
                        <div className="mt-1 text-xs text-ink-muted">&ldquo;{entry.memo}&rdquo;</div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
