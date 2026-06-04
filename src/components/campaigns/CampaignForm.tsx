import { useState } from "react";
import { BookText, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";
import type { Campaign } from "@/types";

interface CampaignFormProps {
  campaign?: Campaign;
}

interface MutationResponse {
  error?: string;
}

const NAME_MAX = 200;
const DESCRIPTION_MAX = 1000;

export function CampaignForm({ campaign }: CampaignFormProps) {
  const isEdit = campaign !== undefined;
  const [name, setName] = useState(campaign?.name ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
  const [status, setStatus] = useState<"active" | "archived">(campaign?.status ?? "active");
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function validate() {
    const next: typeof errors = {};
    if (!name.trim()) {
      next.name = "Name is required";
    } else if (name.length > NAME_MAX) {
      next.name = `Name must be ${String(NAME_MAX)} characters or fewer`;
    }
    if (description.length > DESCRIPTION_MAX) {
      next.description = `Description must be ${String(DESCRIPTION_MAX)} characters or fewer`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // React 19 form action: useFormStatus in SubmitButton tracks `pending`.
  async function handleSubmit() {
    setServerError(null);
    if (!validate()) return;

    const trimmedDescription = description.trim();
    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: trimmedDescription ? trimmedDescription : null,
    };
    if (isEdit) {
      payload.status = status;
    }

    try {
      const res = await fetch(isEdit ? `/api/campaigns/${campaign.id}` : "/api/campaigns", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json()) as MutationResponse;
        setServerError(body.error ?? "Something went wrong");
        return;
      }
      window.location.href = "/campaigns";
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
        placeholder="The Lost Mines of Phandelver"
        error={errors.name}
        icon={<BookText className="size-4" />}
      />

      <div>
        <label htmlFor="description" className="mb-1 block text-sm text-blue-100/80">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
          }}
          placeholder="A short summary of the campaign…"
          rows={4}
          className={cn(
            "w-full rounded-lg border bg-white/10 px-3 py-2 text-white placeholder-white/40 transition-colors focus:ring-2 focus:outline-none",
            errors.description ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-purple-400",
          )}
        />
        {errors.description ? (
          <p className="mt-1 text-xs text-red-300">{errors.description}</p>
        ) : (
          <p className="mt-1 text-xs text-blue-100/40">
            {description.length}/{DESCRIPTION_MAX}
          </p>
        )}
      </div>

      {isEdit ? (
        <div>
          <label htmlFor="status" className="mb-1 block text-sm text-blue-100/80">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "active" | "archived");
            }}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      ) : null}

      <ServerError message={serverError} />

      <SubmitButton pendingText="Saving…" icon={<Save className="size-4" />}>
        {isEdit ? "Save changes" : "Create campaign"}
      </SubmitButton>
    </form>
  );
}
