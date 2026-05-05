"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CONSULTATION_TYPES, WEEKDAYS, type ConsultationType, type Weekday } from "@/lib/validators/availability";

type FormRule = {
  id: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  consultationType: ConsultationType;
  isActive: boolean;
};

type Props = {
  value: FormRule;
  onChange: (next: FormRule) => void;
  onDelete: () => void;
};

export function AvailabilityRuleForm({ value, onChange, onDelete }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="text-sm text-slate-600">
          Weekday
          <select
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
            value={value.weekday}
            onChange={(event) => onChange({ ...value, weekday: event.target.value as Weekday })}
          >
            {WEEKDAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-600">
          Consultation type
          <select
            className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
            value={value.consultationType}
            onChange={(event) => onChange({ ...value, consultationType: event.target.value as ConsultationType })}
          >
            {CONSULTATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 self-end text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.isActive}
            onChange={(event) => onChange({ ...value, isActive: event.target.checked })}
          />
          Active rule
        </label>

        <label className="text-sm text-slate-600">
          Start time
          <Input type="time" value={value.startTime} onChange={(event) => onChange({ ...value, startTime: event.target.value })} />
        </label>
        <label className="text-sm text-slate-600">
          End time
          <Input type="time" value={value.endTime} onChange={(event) => onChange({ ...value, endTime: event.target.value })} />
        </label>
        <div className="hidden md:block" />
        <label className="text-sm text-slate-600">
          Break start
          <Input type="time" value={value.breakStart ?? ""} onChange={(event) => onChange({ ...value, breakStart: event.target.value || undefined })} />
        </label>
        <label className="text-sm text-slate-600">
          Break end
          <Input type="time" value={value.breakEnd ?? ""} onChange={(event) => onChange({ ...value, breakEnd: event.target.value || undefined })} />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="secondary" type="button" onClick={onDelete}>
          Remove rule
        </Button>
      </div>
    </div>
  );
}
