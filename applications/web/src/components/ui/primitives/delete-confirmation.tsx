import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle";
import { Button, ButtonText } from "./button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalTitle,
} from "./modal";
import { msg, useT } from "@/i18n";

interface DeleteConfirmationProps {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  onConfirm: () => void;
}

function resolveDeleteLabel(deleting: boolean): string {
  if (deleting) return msg("Deleting...");
  return msg("Delete");
}

export function DeleteConfirmation({
  title,
  description,
  open,
  onOpenChange,
  deleting,
  onConfirm,
}: DeleteConfirmationProps) {
  const t = useT();

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalTitle>{title}</ModalTitle>
        <ModalDescription>{description}</ModalDescription>
        <ModalFooter>
          <Button variant="destructive" className="w-full justify-center" onClick={onConfirm} disabled={deleting}>
            {deleting && <LoaderCircle size={16} className="animate-spin" />}
            <ButtonText>{t(resolveDeleteLabel(deleting))}</ButtonText>
          </Button>
          <Button variant="elevated" className="w-full justify-center" onClick={() => onOpenChange(false)}>
            <ButtonText>{t("Cancel")}</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
