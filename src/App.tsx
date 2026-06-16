import { For } from "solid-js";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-solid";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Stack, Box, StackProps, HStack, VStack } from "styled-system/jsx";
import { FileUpload } from "./components/ui/file-upload";
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

// Pre-compute waveform SVG paths at module load (viewBox: 200 wide × 100 tall).
// translateX(-50%) on a 200%-wide SVG scrolls exactly one screen width → seamless loop.
const makeSinePath = (y: number, amp: number, λ: number): string => {
  let d = `M0,${y}`;
  for (let x = 0.5; x <= 200.5; x += 0.5) {
    d += ` L${x.toFixed(1)},${(y + amp * Math.sin((2 * Math.PI * x) / λ)).toFixed(2)}`;
  }
  // close down to bottom-right, across to bottom-left, back to start
  d += ` L200,100 L0,100 Z`;
  return d;
};

// Each track: y position (0-100), amplitude, wavelength, scroll speed, delay, opacity weight.
// λ must divide 100 (the scroll offset in viewBox units) for a seamless loop:
// sin(2π × 100/λ) = sin(0) only when 100/λ is a whole number → λ ∈ {20, 25, 50, …}
const WAVE_TRACKS = [
  { d: makeSinePath(10,  2.0, 20), dur: '30s', delay: '0s',    op: 0.90 },
  { d: makeSinePath(22,  3.2, 25), dur: '44s', delay: '-8s',   op: 0.55 },
  { d: makeSinePath(34,  1.5, 20), dur: '24s', delay: '-14s',  op: 1.00 },
  { d: makeSinePath(46,  3.5, 25), dur: '38s', delay: '-5s',   op: 0.50 },
  { d: makeSinePath(56,  2.0, 20), dur: '33s', delay: '-20s',  op: 0.80 },
  { d: makeSinePath(68,  2.8, 50), dur: '52s', delay: '-12s',  op: 0.45 },
  { d: makeSinePath(79,  1.8, 25), dur: '28s', delay: '-18s',  op: 0.70 },
  { d: makeSinePath(90,  2.2, 20), dur: '36s', delay: '-3s',   op: 0.60 },
];

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
      <div class="wave-bg" aria-hidden="true">
        <For each={WAVE_TRACKS}>
          {(w) => (
            <svg
              class="wave-line"
              viewBox="0 0 200 100"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                '--wave-dur': w.dur,
                '--wave-delay': w.delay,
                '--wave-op': w.op,
              }}
            >
              <path d={w.d} fill="#ffe629" fill-opacity="0.2" stroke="#ffe629" stroke-width="0.22" />
            </svg>
          )}
        </For>
      </div>
      <VStack
        py={{ base: "8", smDown: "2" }}
        minH="100vh"
        w="100vw"
        justifyContent="center"
        alignItems="center"
        boxSizing="border-box"
        h={{ smDown: "100dvh" }}
        overflow={{ smDown: "hidden" }}
        gap={{ base: "4", smDown: "2" }}
      >
        <Card.Root
          class="main-card"
          maxW="3xl"
          w="94%"
          flex={{ smDown: "1" }}
          minH={{ smDown: "0" }}
          overflow={{ smDown: "hidden" }}
          display={{ smDown: "flex" }}
          flexDir={{ smDown: "column" }}
        >
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
          <Card.Body
            overflow={{ smDown: "hidden" }}
            flex={{ smDown: "1" }}
            minH={{ smDown: "0" }}
          >
            <Stack
              gap="4"
              direction={{ base: "row", smDown: "column" }}
              h={{ smDown: "full" }}
            >
              <Upload
                flex={{ base: "4", smDown: "0" }}
                flexShrink="0"
                acceptedFiles={[]}
                onFileAccept={(e) =>
                  e.files.forEach((file) => addTask(selectedAccount(), file))
                }
              />
              <Tasks
                flex="3"
                minH={{ base: "20rem", smDown: "0" }}
                maxH={{ base: "20rem", smDown: "none" }}
                flexGrow={{ smDown: "1" }}
                minW="0"
                overflowY="auto"
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
