import { AtprotoDid, Handle } from "@atcute/lexicons/syntax";
import { setting } from "./settings";
import { createSignal } from "solid-js";

export type Account = {
  did: AtprotoDid;
  handle?: Handle;
};

export const loggingIn = setting<AtprotoDid>("loggingIn");

export const accountSetting = setting<Account[]>("accounts");
const [_accounts, _setAccounts] = createSignal<Account[]>(
  accountSetting.get() ?? [],
);
export const accounts = _accounts;
export const setAccounts = (
  value: Account[] | ((prev: Account[]) => Account[]),
) => {
  const newAccounts = _setAccounts(value);
  accountSetting.set(newAccounts);
};

export const [selectedAccount, setSelectedAccount] = createSignal<
  AtprotoDid | undefined
>(accounts().at(0)?.did);
