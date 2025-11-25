import { Component, createSignal, Signal } from "solid-js";

import { CaptionsIcon, SendIcon, XIcon } from "lucide-solid";
import { Stack } from "styled-system/jsx";
import { IconButton } from "~/components/ui/icon-button";
import { Spinner } from "~/components/ui/spinner";
import { Text } from "~/components/ui/text";
import { Link } from "~/components/ui/link";

import { parseCanonicalResourceUri } from "@atcute/lexicons/syntax";
import { css } from "styled-system/css";
import { sendPost } from "~/lib/at";
import { toaster } from "~/components/Toaster";
import { Dialog } from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Account } from "~/lib/accounts";
import { Popover } from "./ui/popover";

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
  const [open, setOpen] = props.openSignal;

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
                  sendPost(
                    props.account?.did!,
                    props.result,
                    postContent(),
                    altText(),
                  )
                    .then((result) => {
                      const parsedUri = parseCanonicalResourceUri(result.uri);
                      if (!parsedUri.ok) throw "failed to parse atproto uri";
                      const { repo, rkey } = parsedUri.value;
                      toaster.create({
                        title: "post sent",
                        description: (
                          <>
                            <Text>view post </Text>
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
                          </>
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
                    });
                }}
                variant="ghost"
                size="sm"
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

export default PostDialog;
