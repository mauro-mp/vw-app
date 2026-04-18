"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { saveDailyFeature, type DfSaveState } from "./actions";

export function DailyFeatureForm({
  date,
  initial,
}: {
  date: string;
  initial?: { name: string; description: string | null; isActive: boolean };
}) {
  const [state, formAction, pending] = useActionState<DfSaveState, FormData>(
    saveDailyFeature,
    undefined
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="date" value={date} />

      <div>
        <Label htmlFor={`name-${date}`}>Nome</Label>
        <Input
          id={`name-${date}`}
          name="name"
          defaultValue={initial?.name ?? ""}
          placeholder="Ex: Bruschetta de tomate com manjericão"
          required
          maxLength={200}
        />
        <FieldError message={state?.fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor={`description-${date}`}>Descrição (opcional)</Label>
        <Textarea
          id={`description-${date}`}
          name="description"
          defaultValue={initial?.description ?? ""}
          maxLength={500}
          rows={2}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`active-${date}`}
          name="isActive"
          type="checkbox"
          defaultChecked={initial ? initial.isActive : true}
          className="h-4 w-4"
        />
        <Label htmlFor={`active-${date}`}>Ativa</Label>
      </div>

      {state?.error ? (
        <p
          className="text-sm text-[color:var(--destructive)] border border-[color:var(--destructive)] rounded p-2"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando..." : initial ? "Atualizar" : "Cadastrar"}
      </Button>
    </form>
  );
}
