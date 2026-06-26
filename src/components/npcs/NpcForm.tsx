import { useState } from "react";
import { User, Drama, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";
import type { Npc } from "@/types";

interface NpcFormProps {
  campaignId: string;
  npc?: Npc; // undefined = create mode
}

interface MutationResponse {
  error?: string;
}

const NAME_MAX = 200;
const ROLE_MAX = 200;
const TRAITS_MAX = 2000;

export function NpcForm({ campaignId, npc }: NpcFormProps) {
  const isEdit = npc !== undefined;
  const [name, setName] = useState(npc?.name ?? "");
  const [role, setRole] = useState(npc?.role ?? "");
  const [traits, setTraits] = useState(npc?.traits ?? "");
  const [errors, setErrors] = useState<{ name?: string; role?: string; traits?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function validate() {
    const next: typeof errors = {};
    if (!name.trim()) {
      next.name = "Name is required";
    } else if (name.length > NAME_MAX) {
      next.name = `Name must be ${String(NAME_MAX)} characters or fewer`;
    }
    if (role.length > ROLE_MAX) {
      next.role = `Role must be ${String(ROLE_MAX)} characters or fewer`;
    }
    if (traits.length > TRAITS_MAX) {
      next.traits = `Traits must be ${String(TRAITS_MAX)} characters or fewer`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // React 19 form action: useFormStatus in SubmitButton tracks `pending`.
  async function handleSubmit() {
    setServerError(null);
    if (!validate()) return;

    const trimmedRole = role.trim();
    const trimmedTraits = traits.trim();
    const payload: Record<string, unknown> = {
      name: name.trim(),
      role: trimmedRole ? trimmedRole : null,
      traits: trimmedTraits ? trimmedTraits : null,
    };
    if (!isEdit) {
      payload.campaign_id = campaignId;
    }

    try {
      const res = await fetch(isEdit ? `/api/npcs/${npc.id}` : "/api/npcs", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json()) as MutationResponse;
        setServerError(body.error ?? "Something went wrong");
        return;
      }
      window.location.href = `/campaigns/${campaignId}`;
    } catch {
      setServerError("Network error. Please try again.");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4" noValidate>
      <FormField
        id="name"
        label="Name"
        value={name}
        onChange={(v) => {
          setName(v);
          if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
        }}
        placeholder="Gundren Rockseeker"
        error={errors.name}
        icon={<User className="size-4" />}
      />

      <FormField
        id="role"
        label="Role"
        value={role}
        onChange={(v) => {
          setRole(v);
          if (errors.role) setErrors((prev) => ({ ...prev, role: undefined }));
        }}
        placeholder="Dwarf merchant"
        error={errors.role}
        icon={<Drama className="size-4" />}
      />

      <div>
        <label htmlFor="traits" className="mb-1 block text-sm text-stone-300/80">
          Traits
        </label>
        <textarea
          id="traits"
          name="traits"
          value={traits}
          onChange={(e) => {
            setTraits(e.target.value);
            if (errors.traits) setErrors((prev) => ({ ...prev, traits: undefined }));
          }}
          placeholder="Gruff but loyal; knows the location of Wave Echo Cave…"
          rows={5}
          className={cn(
            "w-full rounded-lg border bg-white/10 px-3 py-2 text-white placeholder-white/40 transition-colors focus:ring-2 focus:outline-none",
            errors.traits ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-amber-500",
          )}
        />
        {errors.traits ? (
          <p className="mt-1 text-xs text-red-300">{errors.traits}</p>
        ) : (
          <p className="mt-1 text-xs text-stone-300/40">
            {traits.length}/{TRAITS_MAX}
          </p>
        )}
      </div>

      <ServerError message={serverError} />

      <SubmitButton pendingText="Saving…" icon={<Save className="size-4" />}>
        {isEdit ? "Save changes" : "Create NPC"}
      </SubmitButton>
    </form>
  );
}
