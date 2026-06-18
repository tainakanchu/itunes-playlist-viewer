import { invoke } from "@tauri-apps/api/core";

export interface ApiServerStatus {
  enabled: boolean;
  running: boolean;
  port: number;
  url: string | null;
}

/// API サーバーの現在の状態を取得。
export async function getApiServerStatus(): Promise<ApiServerStatus> {
  return invoke("get_api_server_status");
}

/// API サーバーの設定を更新し、必要に応じて起動／停止する。
/// bind 失敗時は throw される（enabled は保存されるが running=false になる）。
export async function setApiServerConfig(
  enabled: boolean,
  port: number,
): Promise<ApiServerStatus> {
  return invoke("set_api_server_config", { enabled, port });
}
