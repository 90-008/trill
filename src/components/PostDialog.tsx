import { createSignal, Signal } from "solid-js";

import { CaptionsIcon, SendIcon, XIcon } from "lucide-solid";
import { HStack, Stack, VStack } from "styled-system/jsx";
import { IconButton } from "~/components/ui/icon-button";
import { Spinner } from "~/components/ui/spinner";
import { Text } from "~/components/ui/text";
import { Link } from "~/components/ui/link";

import { parseCanonicalResourceUri } from "@atcute/lexicons/syntax";
import { css } from "styled-system/css";
import { sendPost, UploadStatus } from "~/lib/at";
import { toaster } from "~/components/Toaster";
import { Dialog } from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Account } from "~/lib/accounts";
import { Popover } from "./ui/popover";
import { Progress } from "./ui/progress";

const PostDialog = (props: {
  result: Blob;
  account: Account | undefined;
  openSignal: Signal<boolean>;
  initialAltText?: string;
}) => {
  const [postContent, setPostContent] = createSignal<string>("");
  const [altText, setAltText] = createSignal<string>(
    props.initialAltText ?? "",
  );
  const [posting, setPosting] = createSignal(false);
  const [uploadStatus, setUploadStatus] = createSignal<UploadStatus | null>(
    null,
  );
  const [open, setOpen] = props.openSignal;

  const getStatusMessage = () => {
    const status = uploadStatus();
    if (!status) return "";

    switch (status.stage) {
      case "auth":
        return "authenticating...";
      case "uploading":
        return "uploading video...";
      case "processing":
        return status.progress
          ? `processing video... ${Math.round(status.progress)}%`
          : "processing video...";
      case "posting":
        return "creating post...";
      case "complete":
        return "complete!";
      default:
        return "";
    }
  };

  const getProgressValue = () => {
    const status = uploadStatus();
    if (!status) return 0;

    switch (status.stage) {
      case "auth":
        return 5;
      case "uploading":
        return 10;
      case "processing":
        return status.progress ? 10 + status.progress * 0.6 : 40;
      case "posting":
        return 90;
      case "complete":
        return 100;
      default:
        return 0;
    }
  };

  return (
    <Dialog.Root open={open()} onOpenChange={(e) => setOpen(e.open)}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Stack>
            <Stack gap="0">
              <video
                class={css({ maxW: "sm", roundedTop: "xs" })}
                controls
                src={URL.createObjectURL(props.result)}
              ></video>
              <Textarea
                placeholder="enter text content..."
                id="post-content"
                value={postContent()}
                onChange={(e) => setPostContent(e.target.value)}
                rows={2}
                resize="none"
                border="none"
                borderTop="1px solid var(--colors-border-muted)"
                boxShadow={{ base: "none", _focus: "none" }}
                disabled={posting()}
              />
            </Stack>
            <Stack
              borderTop="1px solid var(--colors-border-muted)"
              gap="2"
              p="3"
              direction="row"
              align="center"
            >
              <Stack direction="row" align="center">
                <Dialog.Title>
                  post to {props.account?.handle ?? props.account?.did}
                </Dialog.Title>
              </Stack>
              <div class={css({ flexGrow: 1 })} />
              {posting() ? (
                <Spinner
                  borderLeftColor="bg.emphasized"
                  borderBottomColor="bg.emphasized"
                  borderWidth="4px"
                  size="sm"
                />
              ) : (
                <Dialog.CloseTrigger
                  asChild={(closeTriggerProps) => (
                    <IconButton
                      {...closeTriggerProps()}
                      aria-label="Close Dialog"
                      variant="ghost"
                      size="sm"
                    >
                      <XIcon />
                    </IconButton>
                  )}
                />
              )}
              <Popover.Root>
                <Popover.Trigger
                  asChild={(triggerProps) => (
                    <IconButton
                      {...triggerProps()}
                      variant={altText() ? "solid" : "ghost"}
                      size="sm"
                      disabled={posting()}
                    >
                      <CaptionsIcon />
                    </IconButton>
                  )}
                />
                <Popover.Positioner>
                  <Popover.Content width="sm">
                    <Popover.Arrow />
                    <Stack gap="2">
                      <Popover.Title>video alt text</Popover.Title>
                      <Textarea
                        value={altText()}
                        onInput={(e) => setAltText(e.currentTarget.value)}
                        placeholder="describe the video content..."
                        rows={4}
                      />
                    </Stack>
                  </Popover.Content>
                </Popover.Positioner>
              </Popover.Root>
              <IconButton
                disabled={posting()}
                onClick={() => {
                  setPosting(true);
                  setUploadStatus(null);
                  sendPost(
                    props.account?.did!,
                    props.result,
                    postContent(),
                    altText(),
                    (status) => setUploadStatus(status),
                  )
                    .then((result) => {
                      const parsedUri = parseCanonicalResourceUri(result.uri);
                      if (!parsedUri.ok) throw "failed to parse atproto uri";
                      const { repo, rkey } = parsedUri.value;
                      toaster.create({
                        title: "post sent",
                        description: (
                          <HStack gap="1">
                            <Text>view post</Text>
                            <Link
                              href={`https://bsky.app/profile/${repo}/post/${rkey}`}
                              color={{
                                base: "colorPalette.text",
                                _hover: "colorPalette.emphasized",
                              }}
                              textDecoration={{ _hover: "underline" }}
                            >
                              here
                            </Link>
                          </HStack>
                        ),
                        type: "success",
                      });
                      setOpen(false);
                    })
                    .catch((error) => {
                      toaster.create({
                        title: "send post failed",
                        description: error,
                        type: "error",
                      });
                    })
                    .finally(() => {
                      setPosting(false);
                      setUploadStatus(null);
                    });
                }}
                variant="ghost"
                size="sm"
              >
                <SendIcon />
              </IconButton>
            </Stack>
            {posting() && uploadStatus() && (
              <VStack
                gap="2"
                p="2"
                borderTop="1px solid var(--colors-border-muted)"
              >
                <Text fontSize="sm" color="fg.muted">
                  {getStatusMessage()}
                </Text>
                <Progress
                  value={getProgressValue()}
                  max={100}
                  colorPalette="blue"
                />
              </VStack>
            )}
          </Stack>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

export default PostDialog;
