[Setup]
AppId={{76E04C33-F8C5-45AC-BD5D-112E7BC6C420}
AppName=Sidechain by тима осадок
AppVersion=0.2.0
AppPublisher=тима осадок
DefaultDirName={autopf}\тима осадок\Sidechain
DisableDirPage=yes
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
OutputBaseFilename=Sidechain-by-tima-osadok-Setup-0.2.0-win64
Compression=lzma2
SolidCompression=yes
UninstallDisplayName=Sidechain by тима осадок VST3

[Files]
Source: "..\..\..\build\sidechain\Sidechain_artefacts\Release\VST3\Sidechain by тима осадок.vst3\*"; DestDir: "{commoncf64}\VST3\тима осадок\Sidechain by тима осадок.vst3"; Flags: ignoreversion recursesubdirs createallsubdirs
