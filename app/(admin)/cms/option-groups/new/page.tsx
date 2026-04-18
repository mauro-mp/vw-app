"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createOptionGroup, type OgSaveState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export default function NewOptionGroupPage() {
  const [state, formAction, pending] = useActionState<OgSaveState, FormData>(
    createOptionGroup,
    undefined
  );

  return (
    <div className="max-w-lg space-y-6">
      <header>
        <div className="text-xs text-[color:var(--muted)]">
          <Link href="/cms/option-groups" className="hover:underline">
            Option groups
          </Link>{" "}
          / Novo
        </div>
        <h1 className="text-2xl font-bold">Novo option group</h1>
      </header>

      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required placeholder="Ex: Ponto da carne" />
          <FieldError message={state?.fieldErrors?.name} />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isMandatory"
            name="isMandatory"
            type="checkbox"
            defaultChecked={false}
            className="h-4 w-4"
          />
          <Label htmlFor="isMandatory">Cliente é obrigado a escolher</Label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minSelection">Mínimo de escolhas</Label>
            <Input
              id="minSelection"
              name="minSelection"
              type="number"
              min={0}
              max={20}
              defaultValue={0}
            />
            <FieldError message={state?.fieldErrors?.minSelection} />
          </div>
          <div>
            <Label htmlFor="maxSelection">Máximo de escolhas</Label>
            <Input
              id="maxSelection"
              name="maxSelection"
              type="number"
              min={1}
              max={20}
              defaultValue={1}
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

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Criando..." : "Criar e editar opções"}
          </Button>
          <Link
            href="/cms/option-groups"
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm border border-[color:var(--border)] hover:bg-[color:var(--border)]"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
