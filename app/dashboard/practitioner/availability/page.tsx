"use client";

import { useMemo, useState } from "react";

import { AvailabilityRuleForm } from "@/components/calendar/AvailabilityRuleForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { availabilityRuleSchema, blockedDateSchema, type AvailabilityRule, type BlockedDate } from "@/lib/validators/availability";

type FormRule = Omit<AvailabilityRule, "practitionerId">;
type FormBlockedDate = Omit<BlockedDate, "practitionerId">;

const PRACTITIONER_ID = "current-practitioner";

function createRule(): FormRule {
  return {
    id: crypto.randomUUID(),
    weekday: "MONDAY",
    startTime: "09:00",
    endTime: "17:00",
    breakStart: "12:00",
    breakEnd: "13:00",
    consultationType: "IN_PERSON",
    isActive: true,
  };
}

export default function PractitionerAvailabilityPage() {
  const [rules, setRules] = useState<FormRule[]>([createRule()]);
  const [blockedDates, setBlockedDates] = useState<FormBlockedDate[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const hasDuplicateWeekdayPerType = useMemo(() => {
    const keys = new Set<string>();
    for (const rule of rules) {
      const key = `${rule.weekday}:${rule.consultationType}`;
      if (keys.has(key)) {
        return true;
      }
      keys.add(key);
    }
    return false;
  }, [rules]);

  const saveAvailability = () => {
    const validationErrors: string[] = [];

    for (const rule of rules) {
      const parsed = availabilityRuleSchema.safeParse({ ...rule, practitionerId: PRACTITIONER_ID });
      if (!parsed.success) {
        validationErrors.push(...parsed.error.issues.map((issue) => `Rule ${rule.id}: ${issue.message}`));
      }
    }

    for (const blockedDate of blockedDates) {
      const parsed = blockedDateSchema.safeParse({ ...blockedDate, practitionerId: PRACTITIONER_ID });
      if (!parsed.success) {
        validationErrors.push(...parsed.error.issues.map((issue) => `Blocked date ${blockedDate.date}: ${issue.message}`));
      }
    }

    if (hasDuplicateWeekdayPerType) {
      validationErrors.push("Only one rule per weekday and consultation type is allowed.");
    }

    setErrors(validationErrors);
    if (validationErrors.length === 0) {
      alert("Availability settings are valid and ready to persist.");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">Practitioner availability</h1>
      <p className="mt-2 text-sm text-slate-600">Configure working days, times, consultation mode, and blocked dates.</p>

      <section className="mt-6 space-y-4">
        {rules.map((rule) => (
          <AvailabilityRuleForm
            key={rule.id}
            value={rule}
            onChange={(next) => setRules((prev) => prev.map((item) => (item.id === next.id ? next : item)))}
            onDelete={() => setRules((prev) => prev.filter((item) => item.id !== rule.id))}
          />
        ))}
        <Button type="button" variant="secondary" onClick={() => setRules((prev) => [...prev, createRule()])}>
          Add availability rule
        </Button>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium text-slate-900">Blocked dates</h2>
        <div className="mt-3 flex flex-col gap-3 md:flex-row">
          <Input type="date" value={dateInput} onChange={(event) => setDateInput(event.target.value)} />
          <Button
            type="button"
            onClick={() => {
              if (!dateInput) return;
              setBlockedDates((prev) => [...prev, { id: crypto.randomUUID(), date: dateInput }]);
              setDateInput("");
            }}
          >
            Block date
          </Button>
        </div>

        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {blockedDates.map((blockedDate) => (
            <li key={blockedDate.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
              <span>{blockedDate.date}</span>
              <Button variant="secondary" onClick={() => setBlockedDates((prev) => prev.filter((item) => item.id !== blockedDate.id))}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {errors.length > 0 && (
        <section className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <h3 className="font-medium">Validation issues</h3>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <Button type="button" onClick={saveAvailability}>
          Save availability
        </Button>
      </div>
    </main>
  );
}
