{
  lib,
  stdenv,
  deno,
  nodejs,
  makeBinaryWrapper,
  memos-modules,
  oauthMetadata ? builtins.fromJSON (builtins.readFile ../src/lib/oauthMetadata.json),
  VITE_OAUTH_CLIENT_ID ? oauthMetadata.client_id,
  VITE_OAUTH_REDIRECT_URL ? VITE_OAUTH_CLIENT_ID,
  VITE_CLIENT_URI ? VITE_OAUTH_CLIENT_ID,
  VITE_OAUTH_SCOPE ? oauthMetadata.scope,
}:
stdenv.mkDerivation {
  name = "trill";

  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      ../src
      ../index.html
      ../deno.lock
      ../package.json
      ../tsconfig.json
      ../vite.config.ts
      ../postcss.config.cjs
      ../panda.config.ts
    ];
  };

  nativeBuildInputs = [ makeBinaryWrapper ];
  buildInputs = [ deno ];

  inherit
    VITE_OAUTH_REDIRECT_URL
    VITE_OAUTH_CLIENT_ID
    VITE_CLIENT_URI
    VITE_OAUTH_SCOPE
    ;

  dontCheck = true;

  configurePhase = ''
    runHook preConfigure
    cp -R --no-preserve=ownership ${memos-modules} node_modules
    find node_modules -type d -exec chmod 755 {} \;
    substituteInPlace node_modules/.bin/* \
      --replace "/usr/bin/env node" "${nodejs}/bin/node"
    ./node_modules/.bin/panda codegen
    runHook postConfigure
  '';
  buildPhase = ''
    runHook preBuild
    HOME=$TMPDIR deno run --cached-only build
    runHook postBuild
  '';
  installPhase = ''
    runHook preInstall
    mkdir -p $out
    cp -R ./dist/* $out
    runHook postInstall
  '';
}
