"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { updateUnit, type UnitSaveState } from "./actions";

type HoursByDay = Record<string, Array<{ open: string; close: string }>>;

type Unit = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  website: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipcode: string | null;
  timezone: string;
  currency: string;
  locale: string;
  operatingHours: HoursByDay | null;
};

const DAYS: Array<{ key: string; label: string }> = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export function UnitForm({ unit }: { unit: Unit }) {
  const action = updateUnit.bind(null, unit.id);
  const [state, formAction, pending] = useActionState<UnitSaveState, FormData>(action, undefined);

  const hours = unit.operatingHours ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {/* Info básica */}
      <section className="rounded-lg border border-[color:var(--border)] p-4 space-y-4">
        <h2 className="font-semibold text-sm">Informações básicas</h2>
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required defaultValue={unit.name} />
          <FieldError message={state?.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={unit.description ?? ""}
            rows={2}
            maxLength={500}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" defaultValue={unit.phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" name="whatsapp" defaultValue={unit.whatsapp ?? ""} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" name="instagram" defaultValue={unit.instagram ?? ""} />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={unit.website ?? ""}
              placeholder="https://..."
            />
          </div>
        </div>
      </section>

      {/* Endereço */}
      <section className="rounded-lg border border-[color:var(--border)] p-4 space-y-4">
        <h2 className="font-semibold text-sm">Endereço</h2>
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <div>
            <Label htmlFor="addressStreet">Logradouro</Label>
            <Input id="addressStreet" name="addressStreet" defaultValue={unit.addressStreet ?? ""} />
          </div>
          <div>
            <Label htmlFor="addressNumber">Número</Label>
            <Input id="addressNumber" name="addressNumber" defaultValue={unit.addressNumber ?? ""} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="addressComplement">Complemento</Label>
            <Input
              id="addressComplement"
              name="addressComplement"
              defaultValue={unit.addressComplement ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="addressNeighborhood">Bairro</Label>
            <Input
              id="addressNeighborhood"
              name="addressNeighborhood"
              defaultValue={unit.addressNeighborhood ?? ""}
            />
          </div>
        </div>
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
          <div>
            <Label htmlFor="addressCity">Cidade</Label>
            <Input id="addressCity" name="addressCity" defaultValue={unit.addressCity ?? ""} />
          </div>
          <div>
            <Label htmlFor="addressState">UF</Label>
            <Input
              id="addressState"
              name="addressState"
              defaultValue={unit.addressState ?? ""}
              maxLength={2}
            />
          </div>
          <div>
            <Label htmlFor="addressZipcode">CEP</Label>
            <Input id="addressZipcode" name="addressZipcode" defaultValue={unit.addressZipcode ?? ""} />
          </div>
        </div>
      </section>

      {/* Localização */}
      <section className="rounded-lg border border-[color:var(--border)] p-4 space-y-4">
        <h2 className="font-semibold text-sm">Localização e formato</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" name="timezone" defaultValue={unit.timezone} />
          </div>
          <div>
            <Label htmlFor="currency">Moeda (ISO)</Label>
            <Input id="currency" name="currency" defaultValue={unit.currency} maxLength={3} />
          </div>
          <div>
            <Label htmlFor="locale">Locale</Label>
            <Input id="locale" name="locale" defaultValue={unit.locale} />
          </div>
        </div>
      </section>

      {/* Horário */}
      <section className="rounded-lg border border-[color:var(--border)] p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-sm">Horário de funcionamento</h2>
          <p className="text-xs text-[color:var(--muted)]">
            MVP: uma janela por dia. Para múltiplas janelas (almoço + jantar), use a API.
          </p>
        </div>
        {DAYS.map(({ key, label }) => {
          const today = hours[key] ?? [];
          const first = today[0];
          const isClosed = today.length === 0;
          return (
            <div key={key} className="grid grid-cols-[100px_auto_1fr_auto] gap-3 items-center">
              <span className="text-sm">{label}</span>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  name={`closed-${key}`}
                  defaultChecked={isClosed}
                  className="h-3.5 w-3.5"
                />
                Fechado
              </label>
              <div className="flex gap-2 items-center">
                <Input
                  name={`open-${key}`}
                  type="time"
                  defaultValue={first?.open ?? ""}
                  className="w-28"
                />
                <span className="text-xs text-[color:var(--muted)]">até</span>
                <Input
                  name={`close-${key}`}
                  type="time"
                  defaultValue={first?.close ?? ""}
                  className="w-28"
                />
              </div>
              <FieldError message={state?.fieldErrors?.[`hours.${key}`]} />
            </div>
          );
        })}
      </section>

      {state?.error ? (
        <p
          className="text-sm text-[color:var(--destructive)] border border-[color:var(--destructive)] rounded p-2"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2 pt-2 border-t border-[color:var(--border)]">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
