import { createSignal, For } from "solid-js";

import {
  CheckIcon,
  ChevronsUpDownIcon,
  ClipboardIcon,
  HeartIcon,
  MicIcon,
  Trash2Icon,
} from "lucide-solid";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Stack, Box, StackProps, HStack, VStack } from "styled-system/jsx";
import { FileUpload } from "./components/ui/file-upload";
import { IconButton } from "./components/ui/icon-button";
import { Text } from "./components/ui/text";

import { AtprotoDid } from "@atcute/lexicons/syntax";
import {
  Account,
  accounts,
  selectedAccount,
  setSelectedAccount,
} from "./lib/accounts";
import { Toaster } from "~/components/Toaster";
import { createListCollection, Select } from "./components/ui/select";

import { addTask, tasks, TaskState } from "./lib/task";
import Task from "./components/FileTask";
import Settings from "./components/Settings";
import MicRecorder from "./components/MicRecorder";
import { Link } from "./components/ui/link";
import { css } from "styled-system/css";

const App = () => {
  const collection = () =>
    createListCollection({
      items: accounts().map((account) => ({
        label: account.handle ?? account.did,
        value: account.did,
      })),
    });

  const AccountSelect = () => (
    <Select.Root
      positioning={{ sameWidth: true }}
      value={selectedAccount() ? [selectedAccount()!] : []}
      onValueChange={(details) =>
        setSelectedAccount(details.value[0] as AtprotoDid)
      }
      collection={collection()}
    >
      <Select.Control>
        <Select.Trigger
          border="none"
          p="2"
          pl="0"
          minW="8rem"
          maxW="xs"
          boxShadow={{ _focus: "none" }}
          justifyContent="end"
          disabled={accounts().length === 0}
        >
          <Box>
            {selectedAccount() ? "@" : ""}
            <Select.ValueText
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              placeholder="account"
            />
          </Box>
          <ChevronsUpDownIcon />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          <Select.ItemGroup>
            <For each={collection().items}>
              {(item) => (
                <Select.Item item={item}>
                  <Select.ItemText
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    @{item.label}
                  </Select.ItemText>
                  <Select.ItemIndicator pl="2">
                    <CheckIcon />
                  </Select.ItemIndicator>
                </Select.Item>
              )}
            </For>
          </Select.ItemGroup>
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  );

  return (
    <>
      <VStack
        py="8"
        minH="100vh"
        minW="100vw"
        justifyContent="center"
        alignItems="center"
      >
        <Card.Root maxW="3xl" w="94%" h="max">
          <Card.Header>
            <Card.Title w="full">
              <Stack direction="row" align="center">
                <Text>trill</Text>
                <div style="flex-grow: 1;"></div>
                <AccountSelect />
                <Settings />
              </Stack>
            </Card.Title>
            <Card.Description>
              <ol>
                <li>1. upload a voice memo or record one.</li>
                <li>2. it will automatically be converted to a video</li>
                <li>
                  3. (optional) add an account to enable bluesky integration.
                </li>
              </ol>
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <Stack gap="4" direction={{ base: "row", smDown: "column" }}>
              <Upload
                flex="4"
                acceptedFiles={[]}
                onFileAccept={(e) =>
                  e.files.forEach((file) => addTask(selectedAccount(), file))
                }
              />
              <Tasks
                flex="3"
                minH="20rem"
                maxH="20rem"
                minW="0"
                overflowY="scroll"
                currentTasks={tasks.values().toArray()}
                selectedAccount={accounts().find(
                  (account) => account.did === selectedAccount(),
                )}
              />
            </Stack>
          </Card.Body>
        </Card.Root>
        <Card.Root maxW="3xl" w="94%">
          <Card.Header py="2" px="4">
            <Card.Description>
              <HStack justifyContent="space-between" alignItems="center">
                <Text>
                  /made by{" "}
                  <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://gaze.systems"
                  >
                    {Math.random() < 0.98 ? "dawn" : "90008"}
                  </Link>
                  /
                </Text>
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/sponsors/90-008"
                  transition="all"
                  transitionDuration="250ms"
                  color={{ _hover: "red" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fill="currentColor"
                      d="M11.8 1c-1.682 0-3.129 1.368-3.799 2.797C7.33 2.368 5.883 1 4.201 1a4.2 4.2 0 0 0-4.2 4.2c0 4.716 4.758 5.953 8 10.616c3.065-4.634 8-6.05 8-10.616c0-2.319-1.882-4.2-4.2-4.2z"
                    />
                  </svg>
                </Link>
                <Text>
                  source on{" "}
                  <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://tangled.org/did:plc:dfl62fgb7wtjj3fcbb72naae/trill"
                  >
                    tangled
                  </Link>
                </Text>
              </HStack>
            </Card.Description>
          </Card.Header>
        </Card.Root>
      </VStack>
      <Toaster />
    </>
  );
};
export default App;

type TasksProps = StackProps & {
  currentTasks: TaskState[];
  selectedAccount: Account | undefined;
};

const Tasks = (props: TasksProps) => (
  <Stack
    border="1px solid var(--colors-border-subtle)"
    borderBottomWidth="3px"
    gap="1.5"
    p="2"
    rounded="sm"
    justifyContent={props.currentTasks.length === 0 ? "center" : undefined}
    alignItems={props.currentTasks.length === 0 ? "center" : undefined}
    {...props}
  >
    <For
      each={props.currentTasks}
      fallback={
        <Box
          fontSize="sm"
          display="flex"
          justifyContent="center"
          alignItems="center"
          h="full"
        >
          no files processed (yet!)
        </Box>
      }
    >
      {(process) => Task(process, props.selectedAccount)}
    </For>
  </Stack>
);

const getAudioClipboard = async () => {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      console.log(item);
      const type = item.types.find((type) => type.startsWith("audio/"));
      if (type) {
        const blob = await item.getType(type);
        const file = new File([blob], `audio.${type.split("/")[1]}`, { type });
        return file;
      }
    }
    return;
  } catch (err) {
    console.error(err);
    return;
  }
};

const Upload = (props: FileUpload.RootProps) => {
  return (
    <FileUpload.Root maxFiles={100} {...props}>
      <FileUpload.Dropzone borderBottomWidth="3px">
        <FileUpload.Label>drop your files here</FileUpload.Label>
        <HStack alignItems="center">
          <FileUpload.Trigger
            asChild={(triggerProps) => (
              <Button size="sm" {...triggerProps()}>
                or pick file
              </Button>
            )}
          />
          <MicRecorder selectedAccount={selectedAccount} />
          {/*<IconButton
            size="sm"
            onClick={() =>
              getAudioClipboard().then((file) => {
                if (!file) return;
                addTask(selectedAccount(), file);
              })
            }
            variant="subtle"
          >
            <ClipboardIcon />
          </IconButton>*/}
        </HStack>
      </FileUpload.Dropzone>
      <FileUpload.HiddenInput />
    </FileUpload.Root>
  );
};
