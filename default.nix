{
stdenvNoCC
, wrapGAppsHook
, gobject-introspection
, astal
, ags 
}:
stdenvNoCC.mkDerivation rec {
  pname = "novel-ags";
  version = "0.0.1";
  src = ./.;

  nativeBuildInputs = [
    ags
    wrapGAppsHook
    gobject-introspection
  ];

  buildInputs = [
    astal.astal3
    astal.io
  ];

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin
    ags bundle ${src}/app.ts $out/bin/${pname}
    chmod +x $out/bin/${pname}

    runHook postInstall
  '';
}

