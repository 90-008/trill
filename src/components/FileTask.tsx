import {
  CircleAlertIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  SendIcon,
} from "lucide-solid";
import { Stack } from "styled-system/jsx";
import { IconButton } from "~/components/ui/icon-button";
import { Spinner } from "~/components/ui/spinner";
import { Popover } from "~/components/ui/popover";

import { css } from "styled-system/css";
import { Account } from "~/lib/accounts";

import { TaskState } from "~/lib/task";
import PostDialog from "./PostDialog";
import { Button } from "./ui/button";
import { Menu } from "./ui/menu";
import { createSignal } from "solid-js";

const downloadFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // handle file names with periods in them
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const Task = (process: TaskState, selectedAccount: Account | undefined) => {
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const statusError = (error: string) => (
    <Popover.Root>
      <Popover.Trigger
        asChild={(triggerProps) => (
          <IconButton
            {...triggerProps()}
            color={{
              base: "red",
              _hover: "red.emphasized",
            }}
            variant="ghost"
          >
            <CircleAlertIcon />
          </IconButton>
        )}
      />
      <Popover.Positioner>
        <Popover.Content>error processing file: {error}</Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
  const statusSuccess = (result: Blob) => {
    return (
      <>
        <PostDialog
          openSignal={[dialogOpen, setDialogOpen]}
          account={selectedAccount}
          result={result}
        />
        <Menu.Root
          positioning={{ placement: "bottom-start", strategy: "fixed" }}
        >
          <Menu.Trigger
            asChild={(triggerProps) => (
              <IconButton {...triggerProps()} variant="ghost">
                <EllipsisVerticalIcon />
              </IconButton>
            )}
          />
          <Menu.Positioner>
            <Menu.Content>
              <Menu.ItemGroup>
                <Button
                  color={{ _hover: "colorPalette.emphasized" }}
                  onClick={() =>
                    downloadFile(
                      result,
                      process.file.name
                        .split(".")
                        .slice(0, -1)
                        .join(".")
                        .concat(".mp4"),
                    )
                  }
                  variant="ghost"
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  download <DownloadIcon />
                </Button>
                <Button
                  onClick={() => setDialogOpen(!dialogOpen())}
                  disabled={selectedAccount === undefined}
                  color={{ _hover: "colorPalette.emphasized" }}
                  variant="ghost"
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  post to bsky <SendIcon />
                </Button>
              </Menu.ItemGroup>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </>
    );
  };
  const statusProcessing = () => (
    <Spinner
      borderLeftColor="bg.emphasized"
      borderBottomColor="bg.emphasized"
      borderWidth="4px"
      m="2"
    />
  );

  const status = () => {
    switch (process.status) {
      case "success":
        return statusSuccess(process.result);
      case "processing":
        return statusProcessing();
      default:
        return statusError(process.error);
    }
  };

  return (
    <Stack
      direction="row"
      border="1px solid var(--colors-border-muted)"
      borderBottomWidth="2px"
      gap="2"
      align="center"
      rounded="sm"
    >
      <span
        class={css({
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          pl: 2,
        })}
      >
        {process.file.name}
      </span>
      <div class={css({ flexGrow: 1 })}></div>
      <Stack direction="row" gap="0" flexShrink="0" align="center">
        {status()}
      </Stack>
    </Stack>
  );
};

export default Task;
