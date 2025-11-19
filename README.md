## trill

a webapp that converts voice memos into videos, ready for posting on bluesky (or perhaps elsewhere!).
it lets you upload audio files or record directly from the microphone, and automatically generates a
video using your profile picture.

built with [solidjs](https://solidjs.com) and vite. uses [park-ui](https://park-ui.com) for components and [atcute](https://tangled.org/mary.my.id/atcute) for atproto interactions.

see [trill.ptr.pet](https://trill.ptr.pet) for a hosted instance.

### usage

1.  upload a voice memo or record one.
2.  it will automatically be converted to a video.
3.  (optional) add an account to enable bluesky integration.

### running

#### with nix

- build the project: `nix build .#memos`
- enter the dev shell: `nix develop`

#### manually

you'll need deno.

```bash
deno install && panda codegen
deno task dev # or deno task build
```
