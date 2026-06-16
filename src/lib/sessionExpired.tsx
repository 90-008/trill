import { HStack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import { Link } from "~/components/ui/link";
import { toaster } from "~/components/Toaster";
import { relogin } from "./oauth";
import type { AtprotoDid } from "@atcute/lexicons/syntax";

/**
 * Shows a toast telling the user their session expired, with a clickable
 * "re-login" link that re-triggers the OAuth flow for the given account.
 */
export const showSessionExpiredToast = (did: AtprotoDid) => {
  toaster.create({
    title: "session expired",
    description: (
      <HStack gap="1" flexWrap="wrap">
        <Text>your login session has expired, </Text>
        <Link
          cursor="pointer"
          textDecoration="underline"
          onClick={() => relogin(did)}
        >
          click here to re-login
        </Link>
      </HStack>
    ),
    type: "error",
    duration: 10_000,
  });
};
