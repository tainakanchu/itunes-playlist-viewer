; Crateforge 用 NSIS フック。
; デスクトップショートカットは作らない方針なので、インストール直後に削除する。
; （Tauri の既定テンプレートはデスクトップショートカットを作成するため、ここで消す）
!macro NSIS_HOOK_POSTINSTALL
  ; プロダクト名・バイナリ名いずれの命名でも取りこぼさないように消す。
  Delete "$DESKTOP\Crateforge*.lnk"
  Delete "$DESKTOP\crateforge.lnk"
!macroend
