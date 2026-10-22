[Setup]
AppId={{7E1F80E6-33AF-4A88-AD52-22B10FFEF661}
AppName=Синхрон by тима осадок
AppVersion=0.2.2
AppPublisher=тима осадок
DefaultDirName={autopf}\тима осадок\Синхрон
DisableDirPage=yes
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
OutputBaseFilename=Synchron-by-tima-osadok-Setup-0.2.2-win64
Compression=lzma2
SolidCompression=yes
UninstallDisplayName=Синхрон by тима осадок VST3

[Files]
Source: "..\..\..\build\voice-align\VoiceAlign_artefacts\Release\VST3\Синхрон by тима осадок.vst3\*"; DestDir: "{commoncf64}\VST3\тима осадок\Синхрон by тима осадок.vst3"; Flags: ignoreversion recursesubdirs createallsubdirs
