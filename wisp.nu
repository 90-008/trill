#!/usr/bin/env nu

let clientId = "https://trill.wisp.place"
let scope = open src/lib/oauthMetadata.json | get scope

$env.VITE_OAUTH_CLIENT_ID = $"($clientId)/oauth-client-metadata.json"
$env.VITE_OAUTH_REDIRECT_URL = $clientId
$env.VITE_CLIENT_URI = $clientId
$env.VITE_OAUTH_SCOPE = $scope

deno task build
npm create wisp -- deploy -y --spa --path ./dist --site trill did:plc:dfl62fgb7wtjj3fcbb72naae
