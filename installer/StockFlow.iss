#define AppName "StockFlow"
#define AppVersion "2.0.1"
#define AppPublisher "StockFlow"
#define AppExeName "stockflow_windows.exe"
#ifndef Configuration
	#define Configuration "Release"
#endif

[Setup]
AppId={{B4E7D3F2-8C91-4F08-9F5F-7A5E4B2C1101}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\StockFlow
DefaultGroupName=StockFlow
OutputDir=..\build\windows-installer
OutputBaseFilename=StockFlow-Setup-{#AppVersion}-{#Configuration}
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest
WizardStyle=modern

[Files]
Source: "..\apps\windows\build\windows\x64\runner\{#Configuration}\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\StockFlow"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\StockFlow"; Filename: "{app}\{#AppExeName}"

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch StockFlow"; Flags: nowait postinstall skipifsilent