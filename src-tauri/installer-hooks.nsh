!macro NSIS_HOOK_POSTINSTALL
  CreateShortcut "$DESKTOP\Klar.lnk" "$INSTDIR\Klar.exe"
!macroend
!macro NSIS_HOOK_PREUNINSTALL
  Delete "$DESKTOP\Klar.lnk"
!macroend
