!include "LogicLib.nsh"
!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "WinMessages.nsh"

!ifndef PROJECT_ROOT
  !error "PROJECT_ROOT define is required."
!endif

!ifndef PAYLOAD_ZIP
  !error "PAYLOAD_ZIP define is required."
!endif

!ifndef OUTPUT_EXE
  !error "OUTPUT_EXE define is required."
!endif

!define APP_NAME "SC Salvage Companion"
!define APP_DIR_NAME "SCSalvageCompanion"
!define APP_EXECUTABLE "SCSalvageCompanion.exe"
!define UNINSTALL_EXECUTABLE "SCSalvageCompanion-Uninstall.exe"
!define MUI_ICON "${__FILEDIR__}\installer-assets\app-icon.ico"
!define MUI_UNICON "${__FILEDIR__}\installer-assets\app-icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${__FILEDIR__}\installer-assets\header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${__FILEDIR__}\installer-assets\wizard.bmp"

Name "${APP_NAME}"
OutFile "${OUTPUT_EXE}"
InstallDir "$LOCALAPPDATA\${APP_DIR_NAME}"
RequestExecutionLevel user
Unicode True

ShowInstDetails show
BrandingText "SC Salvage Companion Setup"

!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXECUTABLE}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch SC Salvage Companion"

Var BrandTitleFont
Var BrandBodyFont
Var BrandBackground
Var BrandAccent
Var BrandTitleLabel
Var BrandBodyLabel

!insertmacro MUI_PAGE_WELCOME
Page custom BrandThemePage BrandThemePageLeave
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Function BrandThemePage
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 100% ""
  Pop $BrandBackground
  SetCtlColors $BrandBackground 0x00D6E9F3 0x0006131C

  ${NSD_CreateLabel} 0 0 100% 6u ""
  Pop $BrandAccent
  SetCtlColors $BrandAccent 0x00FFB03D 0x00FFB03D

  CreateFont $BrandTitleFont "Segoe UI Semibold" 16 700
  CreateFont $BrandBodyFont "Consolas" 10 400

  ${NSD_CreateLabel} 12u 14u 90% 16u "SC Salvage Companion Installer"
  Pop $BrandTitleLabel
  SendMessage $BrandTitleLabel ${WM_SETFONT} $BrandTitleFont 1
  SetCtlColors $BrandTitleLabel 0x00FFB03D 0x0006131C

  ${NSD_CreateLabel} 12u 38u 90% 72u "Styled to match app tone: deep navy background, amber highlights, and monospace detail text. Click Next to choose install location."
  Pop $BrandBodyLabel
  SendMessage $BrandBodyLabel ${WM_SETFONT} $BrandBodyFont 1
  SetCtlColors $BrandBodyLabel 0x00D6E9F3 0x0006131C

  nsDialogs::Show
FunctionEnd

Function BrandThemePageLeave
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  File "/oname=payload.zip" "${PAYLOAD_ZIP}"

  DetailPrint "Extracting packaged application files..."
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path ''$INSTDIR\payload.zip'' -DestinationPath ''$INSTDIR'' -Force"'
  Pop $0
  ${If} $0 != "0"
    MessageBox MB_ICONSTOP|MB_OK "Could not extract application files. Setup will now exit."
    Abort
  ${EndIf}

  Delete "$INSTDIR\payload.zip"

  CreateDirectory "$SMPROGRAMS\SC Salvage Companion"
  CreateShortCut "$DESKTOP\SC Salvage Companion.lnk" "$INSTDIR\${APP_EXECUTABLE}" "" "$INSTDIR\${APP_EXECUTABLE}" 0
  CreateShortCut "$SMPROGRAMS\SC Salvage Companion\SC Salvage Companion.lnk" "$INSTDIR\${APP_EXECUTABLE}" "" "$INSTDIR\${APP_EXECUTABLE}" 0
  CreateShortCut "$SMPROGRAMS\SC Salvage Companion\Uninstall SC Salvage Companion.lnk" "$INSTDIR\${UNINSTALL_EXECUTABLE}" "" "$INSTDIR\${UNINSTALL_EXECUTABLE}" 0

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_DIR_NAME}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_DIR_NAME}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_DIR_NAME}" "DisplayIcon" "$INSTDIR\${APP_EXECUTABLE}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_DIR_NAME}" "UninstallString" '"$INSTDIR\${UNINSTALL_EXECUTABLE}"'
SectionEnd
