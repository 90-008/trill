import { createSignal } from "solid-js";

export const setting = <T>(key: string) => {
  return {
    get: () => {
      const value = localStorage.getItem(key);
      return value !== null ? (JSON.parse(value) as T) : undefined;
    },
    set: (value: T | undefined) =>
      value === undefined
        ? localStorage.removeItem(key)
        : localStorage.setItem(key, JSON.stringify(value)),
  };
};
export type Setting<T> = ReturnType<typeof setting<T>>;

export const showVisualizer = setting<boolean>("showVisualizer");
export const showProfilePicture = setting<boolean>("showProfilePicture");
export const useDominantColorAsBg = setting<boolean>("useDominantColorAsBg");
export const backgroundColor = setting<string>("backgroundColor");
export const frameRate = setting<number>("frameRate");

export const toggleToRecordSetting = setting<boolean>("toggleToRecord");
const [_toggleToRecord, _setToggleToRecord] = createSignal<boolean>(
  toggleToRecordSetting.get() ?? false,
);
export const toggleToRecord = _toggleToRecord;
export const setToggleToRecord = (
  value: boolean | ((prev: boolean) => boolean),
) => {
  const newAccounts = _setToggleToRecord(value);
  toggleToRecordSetting.set(newAccounts);
};
