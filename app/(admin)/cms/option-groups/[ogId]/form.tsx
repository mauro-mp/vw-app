"use client";

import { useActionState } from "react";
import { updateOptionGroup, type OgSaveState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

type Og = {
  id: string;
  name: string;
  isMandatory: boolean;
  minSelection: number;
  maxSelection: number;
};

export function OptionGroupForm({ og }: { og: Og }) {
  const update = updateOptionGroup.bind(null, og.id);
  const [state, formAction, pending] = useActionState<OgSaveState, FormData>(update, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={og.name} required />
        <FieldError message={state?.fieldErrors?.name} />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isMandatory"
          name="isMandatory"
          type="checkbox"
          defaultChecked={og.isMandatory}
          className="h-4 w-4"
        />
        <Label htmlFor="isMandatory">Cliente é obrigado a escolher</Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="minSelection">Mínimo</Label>
          <Input
            id="minSelection"
            name="minSelection"
            type="number"
            min={0}
            max={20}
            defaultValue={og.minSelection}
          />
          <FieldError message={state?.fieldErrors?.minSelection} />
        </div>
        <div>
          <Label htmlFor="maxSelection">Máximo</Label>
          <Input
            id="maxSelection"
            name="maxSelection"
            type="number"
            min={1}
            max={20}
            defaultValue={og.maxSelection}
          />
          <FieldError message={state?.fieldErrors?.maxSelection} />
        </div>
      </div>

      {state?.error ? (
        <p
          className="text-sm text-[color:var(--destructive)] border border-[color:var(--destructive)] rounded p-2"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
