{
  lib,
  stdenv,
  deno,
}:
stdenv.mkDerivation {
  name = "trill-modules";

  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      ../deno.lock
      ../package.json
    ];
  };

  outputHash = "sha256-1kcPVL0kpo3Ay5ojrcKAePUafRNuKGRSw0sVchTTZB0=";
  outputHashAlgo = "sha256";
  outputHashMode = "recursive";

  nativeBuildInputs = [ deno ];

  dontConfigure = true;
  dontCheck = true;
  dontFixup = true;
  dontPatchShebangs = true;

  buildPhase = ''
    HOME=$TMPDIR deno install --frozen --seed 8008135
  '';
  installPhase = ''
    cp -R node_modules $out
    ls -la $out
  '';
}
