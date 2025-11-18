import { XIcon } from "lucide-solid";
import { Toast } from "~/components/ui/toast";
import { IconButton } from "./ui/icon-button";

export const toaster = Toast.createToaster({
  placement: "bottom-start",
  overlap: false,
  gap: 12,
});

export const Toaster = () => (
  <Toast.Toaster toaster={toaster}>
    {(toast) => (
      <Toast.Root>
        <Toast.Title>{toast().title}</Toast.Title>
        <Toast.Description>{toast().description}</Toast.Description>
        <Toast.CloseTrigger
          asChild={(closeProps) => (
            <IconButton {...closeProps()} size="sm" variant="link">
              <XIcon />
            </IconButton>
          )}
        />
      </Toast.Root>
    )}
  </Toast.Toaster>
);
