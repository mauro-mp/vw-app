"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { createEmployee, updateEmployee, type EmpSaveState } from "./actions";

type Unit = { id: string; name: string };

type Employee = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OPERATOR";
  isActive: boolean;
  unitIds: string[];
};

export function EmployeeForm({
  mode,
  employee,
  units,
}: {
  mode: "create" | "edit";
  employee?: Employee;
  units: Unit[];
}) {
  const action =
    mode === "create" ? createEmployee : updateEmployee.bind(null, employee!.id);
  const [state, formAction, pending] = useActionState<EmpSaveState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={employee?.name ?? ""}
          maxLength={120}
        />
        <FieldError message={state?.fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={employee?.email ?? ""}
        />
        <FieldError message={state?.fieldErrors?.email} />
      </div>

      <div>
        <Label htmlFor="password">
          Senha {mode === "edit" ? <span className="text-xs text-[color:var(--muted)]">(opcional — só preencha para alterar)</span> : null}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required={mode === "create"}
          minLength={8}
          placeholder={mode === "edit" ? "Deixe em branco para manter" : "Mínimo 8 caracteres"}
        />
        <FieldError message={state?.fieldErrors?.password} />
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <Select id="role" name="role" defaultValue={employee?.role ?? "OPERATOR"}>
          <option value="OPERATOR">OPERATOR (acesso operacional)</option>
          <option value="ADMIN">ADMIN (acesso total)</option>
        </Select>
        <p className="text-xs text-[color:var(--muted)] mt-1">
          ADMIN tem acesso a todas as unidades do tenant. OPERATOR só às unidades selecionadas abaixo.
        </p>
      </div>

      <div>
        <Label>Unidades</Label>
        <div className="space-y-1.5 border border-[color:var(--border)] rounded-md p-3">
          {units.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Sem unidades cadastradas.</p>
          ) : null}
          {units.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="unitIds"
                value={u.id}
                defaultChecked={employee?.unitIds.includes(u.id) ?? units.length === 1}
                className="h-4 w-4"
              />
              {u.name}
            </label>
          ))}
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
        {pending ? "Salvando..." : mode === "create" ? "Criar" : "Salvar"}
      </Button>
    </form>
  );
}
