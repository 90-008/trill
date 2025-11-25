import { Component, createSignal, For, JSXElement, Signal } from "solid-js";

import {
  CheckIcon,
  ChevronsUpDownIcon,
  CogIcon,
  PipetteIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-solid";
import { Button } from "~/components/ui/button";
import { Field } from "~/components/ui/field";
import { Stack, Box, HStack } from "styled-system/jsx";
import { IconButton } from "~/components/ui/icon-button";
import { FormLabel } from "~/components/ui/form-label";
import { Checkbox } from "~/components/ui/checkbox";
import { Drawer } from "~/components/ui/drawer";
import { Text } from "~/components/ui/text";

import { Handle, isHandle } from "@atcute/lexicons/syntax";
import { css } from "styled-system/css";
import { flow, sessions } from "~/lib/oauth";
import {
  Account,
  loggingIn,
  accounts,
  setAccounts,
  setSelectedAccount,
} from "~/lib/accounts";
import {
  showProfilePicture as showProfilePictureSetting,
  showVisualizer as showVisualizerSetting,
  backgroundColor as backgroundColorSetting,
  frameRate as frameRateSetting,
  useDominantColorAsBg as useDominantColorAsBgSetting,
  autoTranscribe as autoTranscribeSetting,
  whisperModel as whisperModelSetting,
  Setting,
  defaultWhisperModel,
} from "~/lib/settings";
import { handleResolver } from "~/lib/at";
import { toaster } from "~/components/Toaster";
import { createListCollection, Select } from "~/components/ui/select";

import { type Color, type ListCollection, parseColor } from "@ark-ui/solid";
import { ColorPicker } from "~/components/ui/color-picker";
import { Input } from "~/components/ui/input";
import { preloadModel } from "~/lib/transcribe";

const SettingCheckbox = (props: {
  setting: Setting<boolean>;
  signal: Signal<boolean>;
  label: string;
  disabled?: boolean;
}) => (
  <Checkbox
    p="2"
    checked={props.signal[0]()}
    onCheckedChange={(e) => {
      const val = e.checked === "indeterminate" ? false : e.checked;
      props.signal[1](val);
      props.setting.set(val);
    }}
    disabled={props.disabled}
    colorPalette={props.disabled ? "gray" : undefined}
    cursor={props.disabled ? { _hover: "not-allowed" } : undefined}
  >
    <Text color={props.disabled ? "fg.disabled" : undefined}>
      {props.label}
    </Text>
  </Checkbox>
);

const SettingSelect = (props: {
  label: string;
  signal: Signal<string>;
  collection: ListCollection<{ label: string; value: string }>;
}) => (
  <Select.Root
    width="2xs"
    positioning={{ sameWidth: true }}
    value={[props.signal[0]()]}
    onValueChange={(details) => props.signal[1](details.value[0])}
    collection={props.collection}
  >
    <Select.Label px="2">{props.label}</Select.Label>
    <Select.Control>
      <Select.Trigger border="none" p="2" boxShadow={{ _focus: "none" }}>
        <Select.ValueText placeholder="account" />
        <ChevronsUpDownIcon />
      </Select.Trigger>
    </Select.Control>
    <Select.Positioner>
      <Select.Content>
        <Select.ItemGroup>
          <For each={props.collection.items}>
            {(item) => (
              <Select.Item item={item}>
                <Select.ItemText>{item.label}</Select.ItemText>
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

const SettingColorPicker = (props: {
  label: string;
  signal: Signal<Color>;
}) => {
  return (
    <ColorPicker.Root
      p="2"
      value={props.signal[0]()}
      onValueChange={(e) => props.signal[1](e.value)}
      onValueChangeEnd={(e) => props.signal[1](e.value)}
    >
      <ColorPicker.Context>
        {(api) => (
          <>
            <ColorPicker.Label>{props.label}</ColorPicker.Label>
            <ColorPicker.Control>
              <ColorPicker.ChannelInput
                channel="hex"
                asChild={(inputProps) => <Input {...inputProps()} />}
              />
              <ColorPicker.Trigger
                asChild={(triggerProps) => (
                  <IconButton variant="outline" {...triggerProps()}>
                    <ColorPicker.Swatch value={api().value} />
                  </IconButton>
                )}
              />
            </ColorPicker.Control>
            <ColorPicker.Positioner>
              <ColorPicker.Content>
                <Stack gap="3">
                  <ColorPicker.Area>
                    <ColorPicker.AreaBackground />
                    <ColorPicker.AreaThumb />
                  </ColorPicker.Area>
                  <HStack gap="3">
                    <ColorPicker.EyeDropperTrigger
                      asChild={(triggerProps) => (
                        <IconButton
                          size="xs"
                          variant="outline"
                          aria-label="Pick a color"
                          {...triggerProps()}
                        >
                          <PipetteIcon />
                        </IconButton>
                      )}
                    />
                    <Stack gap="2" flex="1">
                      <ColorPicker.ChannelSlider channel="hue">
                        <ColorPicker.ChannelSliderTrack />
                        <ColorPicker.ChannelSliderThumb />
                      </ColorPicker.ChannelSlider>
                      <ColorPicker.ChannelSlider channel="alpha">
                        <ColorPicker.TransparencyGrid size="8px" />
                        <ColorPicker.ChannelSliderTrack />
                        <ColorPicker.ChannelSliderThumb />
                      </ColorPicker.ChannelSlider>
                    </Stack>
                  </HStack>
                  <HStack>
                    <ColorPicker.ChannelInput
                      channel="hex"
                      asChild={(inputProps) => (
                        <Input size="2xs" {...inputProps()} />
                      )}
                    />
                    <ColorPicker.ChannelInput
                      channel="alpha"
                      asChild={(inputProps) => (
                        <Input size="2xs" {...inputProps()} />
                      )}
                    />
                  </HStack>
                </Stack>
              </ColorPicker.Content>
            </ColorPicker.Positioner>
          </>
        )}
      </ColorPicker.Context>
      <ColorPicker.HiddenInput />
    </ColorPicker.Root>
  );
};

const Category = ({
  title,
  children,
}: {
  title: string;
  children: JSXElement;
}) => (
  <Stack>
    <FormLabel>{title}</FormLabel>
    <Stack
      gap="0"
      border="1px solid var(--colors-border-default)"
      borderBottomWidth="3px"
      rounded="xs"
    >
      {children}
    </Stack>
  </Stack>
);

const Settings = () => {
  const [handle, setHandle] = createSignal("");
  const isHandleValid = () => isHandle(handle());

  const deleteAccount = (account: Account) => {
    const newAccounts = accounts().filter((a) => a.did !== account.did);
    setAccounts(newAccounts);
    sessions.remove(account.did);
    setSelectedAccount(newAccounts[0]?.did ?? undefined);
  };

  const startAccountFlow = async () => {
    try {
      toaster.create({
        title: "logging in",
        description: `logging in to ${handle()}...`,
        type: "info",
      });
      const did = await handleResolver.resolve(handle() as Handle);
      loggingIn.set(did);
      await flow.start(did);
    } catch (err) {
      console.error(err);
      toaster.create({
        title: "login error",
        description: `${err}`,
        type: "error",
      });
      loggingIn.set(undefined);
    }
  };

  const Accounts = () => {
    const item = (account: Account, isLatest: boolean) => (
      <Stack
        direction="row"
        w="full"
        px="2"
        pb="2"
        borderBottom={
          !isLatest ? "1px solid var(--colors-border-muted)" : undefined
        }
        align="center"
      >
        {account.handle ? `@${account.handle}` : account.did}
        <div class={css({ flexGrow: 1 })} />
        <IconButton
          onClick={() => deleteAccount(account)}
          variant="ghost"
          size="sm"
        >
          <Trash2Icon />
        </IconButton>
      </Stack>
    );
    const items = (accounts: Account[]) => (
      <For
        each={accounts}
        fallback={
          <Text color="fg.muted" px="2" pb="2" alignSelf="center">
            no accounts added
          </Text>
        }
      >
        {(acc, idx) => item(acc, idx() === accounts.length - 1)}
      </For>
    );
    return (
      <Category title="accounts">
        <Stack
          borderBottom="1px solid var(--colors-border-default)"
          p="2"
          marginBottom="2"
          direction="row"
          gap="2"
          w="full"
        >
          <Field.Root w="full">
            <Field.Input
              placeholder="example.bsky.social"
              value={handle()}
              onInput={(e) => setHandle(e.currentTarget.value)}
            />
          </Field.Root>
          <IconButton onClick={startAccountFlow} disabled={!isHandleValid()}>
            <PlusIcon />
          </IconButton>
        </Stack>
        {items(accounts())}
      </Category>
    );
  };

  const [showProfilePicture, setShowProfilePicture] = createSignal(
    showProfilePictureSetting.get() ?? true,
  );
  const [showVisualizer, setShowVisualizer] = createSignal(
    showVisualizerSetting.get() ?? true,
  );
  const [useDominantColorAsBg, setUseDominantColorAsBg] = createSignal(
    useDominantColorAsBgSetting.get() ?? true,
  );

  const frameRateCollection = createListCollection({
    items: [24, 30, 60].map((rate) => ({
      label: `${rate} FPS`,
      value: rate.toString(),
    })),
  });
  const [frameRate, _setFrameRate] = createSignal(
    (frameRateSetting.get() ?? 24).toString(),
  );
  const setFrameRate = (value: string | ((prev: string) => string)) => {
    const newFrameRate = _setFrameRate(value);
    frameRateSetting.set(parseInt(newFrameRate));
  };

  const [backgroundColor, _setBackgroundColor] = createSignal(
    parseColor(backgroundColorSetting.get() ?? "#000000"),
  );
  const setBackgroundColor = (value: Color | ((prev: Color) => Color)) => {
    const newColor = _setBackgroundColor(value);
    backgroundColorSetting.set(newColor.toString("rgb"));
  };

  const whisperModelCollection = createListCollection({
    items: [
      { tag: "tiny", size: "40MB" },
      { tag: "base", size: "80MB" },
      { tag: "small", size: "250MB" },
    ].map((model) => ({
      label: `${model.tag} (${model.size})`,
      value: `onnx-community/whisper-${model.tag}`,
    })),
  });
  const [whisperModel, _setWhisperModel] = createSignal(
    (whisperModelSetting.get() ?? defaultWhisperModel).toString(),
  );
  const setWhisperModel = (value: string | ((prev: string) => string)) => {
    const newModel = _setWhisperModel(value);
    whisperModelSetting.set(newModel);
    if (autoTranscribe()) setTimeout(() => preloadModel(), 200);
  };
  const [autoTranscribe, setAutoTranscribe] = createSignal(
    autoTranscribeSetting.get() ?? false,
  );

  return (
    <Drawer.Root>
      <Drawer.Trigger
        asChild={(triggerProps) => (
          <IconButton variant="outline" {...triggerProps()}>
            <CogIcon />
          </IconButton>
        )}
      />
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content>
          <Drawer.Header p="0" pl="4">
            <Stack direction="row" alignItems="center">
              <Drawer.Title>settings</Drawer.Title>
              <div style="flex-grow: 1;"></div>
              <Drawer.CloseTrigger
                placeSelf="end"
                asChild={(closeProps) => (
                  <IconButton size="lg" {...closeProps()} variant="ghost">
                    <XIcon />
                  </IconButton>
                )}
              />
            </Stack>
          </Drawer.Header>
          <Drawer.Body>
            <Stack gap="4">
              <Accounts />
              <Category title="video processing">
                <Box borderBottom="1px solid var(--colors-border-subtle)">
                  <SettingCheckbox
                    label="show profile picture"
                    setting={showProfilePictureSetting}
                    signal={[showProfilePicture, setShowProfilePicture]}
                  />
                </Box>
                <SettingCheckbox
                  label="show visualizer"
                  setting={showVisualizerSetting}
                  signal={[showVisualizer, setShowVisualizer]}
                />
                <Stack gap="0" borderY="1px solid var(--colors-border-muted)">
                  <SettingCheckbox
                    label="use dominant color as bg"
                    setting={useDominantColorAsBgSetting}
                    signal={[useDominantColorAsBg, setUseDominantColorAsBg]}
                    disabled={!showProfilePicture()}
                  />
                  <SettingColorPicker
                    label="background color"
                    signal={[backgroundColor, setBackgroundColor]}
                  />
                </Stack>
                <SettingSelect
                  label="frame rate"
                  signal={[frameRate, setFrameRate]}
                  collection={frameRateCollection}
                />
              </Category>
              <Category title="audio transcription">
                <Box borderBottom="1px solid var(--colors-border-subtle)">
                  <SettingCheckbox
                    label="transcribe audio"
                    setting={autoTranscribeSetting}
                    signal={[
                      autoTranscribe,
                      (val) => {
                        const newVal = setAutoTranscribe(val);
                        if (newVal) preloadModel();
                        return val;
                      },
                    ]}
                  />
                </Box>
                <Box borderBottom="1px solid var(--colors-border-subtle)">
                  <SettingSelect
                    label="whisper model"
                    signal={[whisperModel, setWhisperModel]}
                    collection={whisperModelCollection}
                  />
                </Box>
                <Text color="fg.subtle" p="2" fontSize="sm" fontWeight="normal">
                  note: the model will only be downloaded once.
                </Text>
              </Category>
            </Stack>
          </Drawer.Body>
          <Drawer.Footer p="2" gap="3">
            <Drawer.CloseTrigger
              asChild={(closeProps) => (
                <Button {...closeProps()} variant="outline">
                  back
                </Button>
              )}
            />
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
};
export default Settings;
