"use client";

import { useActionState } from "react";
import { saveItem, type ItemSaveState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FieldError } from "@/components/ui/input";

type CategoryOption = {
  id: string;
  name: string;
  sectionName: string;
  subcategories: { id: string; name: string }[];
};

type Item = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: string;
  isAvailable: boolean;
  ean: string | null;
  agentInstructions: string | null;
  categoryId: string;
  subcategoryId: string | null;
};

export function ItemForm({
  item,
  categories,
}: {
  item: Item;
  categories: CategoryOption[];
}) {
  const save = saveItem.bind(null, item.id);
  const [state, formAction, pending] = useActionState<ItemSaveState, FormData>(save, undefined);

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={item.name} required maxLength={120} />
        <FieldError message={state?.fieldErrors?.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="categoryId">Categoria</Label>
          <Select id="categoryId" name="categoryId" defaultValue={item.categoryId} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.sectionName} / {c.name}
              </option>
            ))}
          </Select>
          <FieldError message={state?.fieldErrors?.categoryId} />
        </div>
        <div>
          <Label htmlFor="subcategoryId">Subcategoria</Label>
          <Select id="subcategoryId" name="subcategoryId" defaultValue={item.subcategoryId ?? ""}>
            <option value="">— nenhuma —</option>
            {categories
              .flatMap((c) => c.subcategories.map((s) => ({ ...s, catName: c.name })))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.catName} / {s.name}
                </option>
              ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={item.description ?? ""}
          maxLength={500}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="basePrice">Preço base (R$)</Label>
          <Input
            id="basePrice"
            name="basePrice"
            defaultValue={Number(item.basePrice).toFixed(2).replace(".", ",")}
            placeholder="29,90"
            required
          />
          <FieldError message={state?.fieldErrors?.basePrice} />
        </div>
        <div>
          <Label htmlFor="ean">EAN (opcional)</Label>
          <Input id="ean" name="ean" defaultValue={item.ean ?? ""} maxLength={50} />
        </div>
      </div>

      <div>
        <Label htmlFor="imageUrl">URL da imagem (opcional)</Label>
        <Input
          id="imageUrl"
          name="imageUrl"
          type="url"
          defaultValue={item.imageUrl ?? ""}
          placeholder="https://..."
        />
        <FieldError message={state?.fieldErrors?.imageUrl} />
      </div>

      <div>
        <Label htmlFor="agentInstructions">Instruções para o agente (Phil)</Label>
        <Textarea
          id="agentInstructions"
          name="agentInstructions"
          defaultValue={item.agentInstructions ?? ""}
          placeholder="Ex: perguntar se quer ovo extra."
          rows={2}
          maxLength={1000}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isAvailable"
          name="isAvailable"
          type="checkbox"
          defaultChecked={item.isAvailable}
          className="h-4 w-4"
        />
        <Label htmlFor="isAvailable">Disponível para venda</Label>
      </div>

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
