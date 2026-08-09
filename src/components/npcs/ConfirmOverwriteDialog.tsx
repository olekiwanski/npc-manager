import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOverwriteDialogProps {
  open: boolean;
  newTypeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmOverwriteDialog({ open, newTypeName, onConfirm, onCancel }: ConfirmOverwriteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace stats with {newTypeName}?</DialogTitle>
          <DialogDescription>
            Your manually-edited Attributes and standard Creature Traits will be replaced with {newTypeName}&rsquo;s
            defaults. Any Creature Traits or Skills/Talents you added yourself are kept either way.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Replace with {newTypeName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
