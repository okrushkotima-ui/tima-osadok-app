[Setup]
AppId={{83A7FB1A-B7CD-4AF9-813B-EB992993AB34}
AppName=Ближе by тима осадок
AppVersion=0.1.1
AppPublisher=тима осадок
DefaultDirName={autopf}\тима осадок\Ближе by тима осадок
DisableDirPage=yes
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
OutputBaseFilename=Blizhe-by-tima-osadok-Setup-0.1.1-win64
Compression=lzma2
SolidCompression=yes
UninstallDisplayName=Ближе by тима осадок VST3
[InstallDelete]
Type: filesandordirs; Name: "{commoncf64}\VST3\тима осадок\ближе.vst3"

[Files]
Source: "..\..\..\build\blizhe\Blizhe_artefacts\Release\VST3\Ближе by тима осадок.vst3\*"; DestDir: "{commoncf64}\VST3\тима осадок\ближе.vst3"; Flags: ignoreversion recursesubdirs createallsubdirs
