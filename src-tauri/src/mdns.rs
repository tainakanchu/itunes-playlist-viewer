//! LAN 公開中の内蔵 API サーバーを mDNS (DNS-SD) で広告する。
//!
//! クライアント (モバイル等) が `_crateforge._tcp.local.` を探索して
//! ホスト・ポートを自動発見できるようにするためのサーバー側アドバタイズ。
//! クライアント側の探索 (zeroconf 等) は別 issue の範囲なので、ここでは
//! 「広告する」ことだけを担う。
//!
//! 広告はベストエフォート。`ServiceDaemon` の生成や `register` が失敗しても
//! サーバー本体の稼働には影響させない (呼び出し側が `Err` を warn ログに留める)。
//! IP アドレスは `enable_addr_auto` で OS から自動検出・追従させるため、
//! 手動でのインタフェース列挙は不要。

use mdns_sd::{ServiceDaemon, ServiceInfo};

/// mDNS サービス種別。
const SERVICE_TYPE: &str = "_crateforge._tcp.local.";
/// サービスインスタンス名。
const INSTANCE_NAME: &str = "Crateforge";

/// 稼働中の mDNS 広告。`Drop` で unregister + shutdown する
/// (= サーバー停止に追従してネットワークから広告を取り下げる)。
pub struct MdnsAdvertiser {
    daemon: ServiceDaemon,
    fullname: String,
}

impl MdnsAdvertiser {
    /// 指定ポートで API サーバーを広告し始める。
    /// IP アドレスは `enable_addr_auto` で自動検出するため、空文字を渡す。
    pub fn start(port: u16) -> Result<Self, String> {
        let daemon = ServiceDaemon::new().map_err(|e| e.to_string())?;
        let host_name = format!("{}.local.", INSTANCE_NAME.to_lowercase());
        let service = ServiceInfo::new(
            SERVICE_TYPE,
            INSTANCE_NAME,
            &host_name,
            "", // ip: enable_addr_auto で自動補完するためプレースホルダ
            port,
            &[("path", "/")][..],
        )
        .map_err(|e| e.to_string())?
        .enable_addr_auto();
        let fullname = service.get_fullname().to_string();
        daemon.register(service).map_err(|e| e.to_string())?;
        Ok(MdnsAdvertiser { daemon, fullname })
    }
}

impl Drop for MdnsAdvertiser {
    fn drop(&mut self) {
        // どちらもベストエフォート (受信側 Receiver は捨てる)。
        let _ = self.daemon.unregister(&self.fullname);
        let _ = self.daemon.shutdown();
    }
}
