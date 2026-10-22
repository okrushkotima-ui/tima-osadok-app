[Setup]
AppId={{83A7FB1A-B7CD-4AF9-813B-EB992993AB34}
AppName=ближе
AppVersion=0.1.0
AppPublisher=тима осадок
DefaultDirName={autopf}\тима осадок\ближе
DisableDirPage=yes
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
OutputBaseFilename=blizhe-Setup-0.1.0-win64
Compression=lzma2
SolidCompression=yes
UninstallDisplayName=ближе VST3
[Files]
Source: "..\..\..\..\build\blizhe\Blizhe_artefacts\Release\VST3\ближе.vst3\*"; DestDir: "{commoncf64}\VST3\тима осадок\ближе.vst3"; Flags: ignoreversion recursesubdirs createallsubdirs
