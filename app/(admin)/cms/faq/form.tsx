"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { createFaq, updateFaq, type FaqSaveState } from "./actions";

type FaqItemShape = {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
};

export function FaqForm({
  mode,
  item,
  existingCategories,
}: {
  mode: "create" | "edit";
  item?: FaqItemShape;
  existingCategories: string[];
}) {
  const action =
    mode === "create" ? createFaq : updateFaq.bind(null, item!.id);
  const [state, formAction, pending] = useActionState<FaqSaveState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      <div>
        <Label htmlFor="category">Categoria</Label>
        <Input
          id="category"
          name="category"
          required
          defaultValue={item?.category ?? ""}
          list="faq-categories"
          placeholder="Ex: Pagamento"
          maxLength={80}
        />
        <datalist id="faq-categories">
          {existingCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <p className="text-xs text-[color:var(--muted)] mt-1">
          Pode reutilizar categorias já cadastradas (aparecem como sugestão) ou digitar uma nova.
        </p>
        <FieldError message={state?.fieldErrors?.category} />
      </div>

      <div>
        <Label htmlFor="question">Pergunta</Label>
        <Input
          id="question"
          name="question"
          required
          defaultValue={item?.question ?? ""}
          maxLength={300}
          placeholder="Ex: Quais formas de pagamento vocês aceitam?"
        />
        <FieldError message={state?.fieldErrors?.question} />
      </div>

      <div>
        <Label htmlFor="answer">Resposta</Label>
        <Textarea
          id="answer"
          name="answer"
          required
          defaultValue={item?.answer ?? ""}
          rows={4}
          maxLength={2000}
          placeholder="Resposta que o Phil irá usar como referência."
        />
        <FieldError message={state?.fieldErrors?.answer} />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
        <div>
          <Label htmlFor="sortOrder">Ordem (menor = primeiro)</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={item?.sortOrder ?? 0}
            min={0}
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <input
            id="isPublished"
            name="isPublished"
            type="checkbox"
            defaultChecked={item ? item.isPublished : true}
            className="h-4 w-4"
          />
          <Label htmlFor="isPublished">Publicada</Label>
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

      <div className="flex gap-2 pt-2 border-t border-[color:var(--border)]">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
