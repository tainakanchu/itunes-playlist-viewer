// Connect 画面。手入力（URL + token）と QR スキャンの 2 通りでサーバーに接続する。
// 接続成功後の遷移は _layout の Gate が担う（status==='connected' で / へ）。

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  isAvailable as mdnsIsAvailable,
  startDiscovery,
  stopDiscovery,
  addServiceFoundListener,
  type DiscoveredService,
} from "expo-crateforge-mdns";

import Screen from "@/components/Screen";
import { BRAND, PALETTE } from "@/constants/brand";
import { useConnection, useDownloads } from "@crateforge/core";
import QrScanner, { parseConnectionQr } from "@/features/connect/QrScanner";

// ネイティブ mDNS モジュールが使えるか（Expo Go / web では false）。
// false のときは探索 UI を出さず、従来どおり手入力 URL + QR で接続する。
const DISCOVERY_AVAILABLE = mdnsIsAvailable();

export default function ConnectScreen() {
  const status = useConnection((s) => s.status);
  const router = useRouter();
  const hasDownloads = useDownloads((s) => Object.keys(s.entries).length > 0);
  const error = useConnection((s) => s.error);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredService[]>([]);

  const connecting = status === "connecting";

  // mDNS 探索: 画面表示中だけ走らせ、見つかったサーバーを重複排除して並べる。
  // ネイティブが無ければ何もしない（startDiscovery 等は no-op）。
  useEffect(() => {
    if (!DISCOVERY_AVAILABLE) return;
    startDiscovery();
    const sub = addServiceFoundListener((svc) => {
      setDiscovered((prev) => {
        const key = `${svc.host}:${svc.port}`;
        if (prev.some((s) => `${s.host}:${s.port}` === key)) return prev;
        return [...prev, svc];
      });
    });
    return () => {
      sub.remove();
      stopDiscovery();
    };
  }, []);

  function connect(rawUrl: string, rawToken: string | null) {
    void useConnection.getState().connect(rawUrl, rawToken && rawToken !== "" ? rawToken : null);
  }

  function handleConnect() {
    connect(url, token);
  }

  function handlePickDiscovered(svc: DiscoveredService) {
    stopDiscovery();
    const addr = `${svc.host}:${svc.port}`;
    setUrl(addr);
    connect(addr, token);
  }

  function handleScanned(data: string) {
    setScanning(false);
    const parsed = parseConnectionQr(data);
    if (!parsed) {
      // パース不能。手入力欄に生データを残してユーザーに委ねる。
      setUrl(data);
      return;
    }
    setUrl(parsed.baseUrl);
    setToken(parsed.token ?? "");
    connect(parsed.baseUrl, parsed.token);
  }

  return (
    <Screen style={styles.root}>
      <View style={styles.brand}>
        <Ionicons name="disc" size={48} color={PALETTE.accent} />
        <Text style={styles.title}>Crateforge に接続</Text>
        <Text style={styles.subtitle}>同じ LAN のデスクトップへ接続します</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.fieldLabel}>サーバー URL</Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="192.168.x.x:8787"
          placeholderTextColor={PALETTE.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!connecting}
          style={styles.input}
          accessibilityLabel="サーバー URL"
        />

        <Text style={styles.fieldLabel}>トークン（任意）</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="X-API-Token"
          placeholderTextColor={PALETTE.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          editable={!connecting}
          style={styles.input}
          accessibilityLabel="トークン"
        />

        {status === "error" && error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleConnect}
          disabled={connecting}
          accessibilityRole="button"
          accessibilityLabel="接続"
          style={({ pressed }) => [
            styles.primary,
            connecting && styles.primaryDisabled,
            pressed && !connecting && styles.pressed,
          ]}
        >
          {connecting ? (
            <ActivityIndicator color={BRAND.accentText} />
          ) : (
            <Text style={styles.primaryText}>接続</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.or}>または</Text>
          <View style={styles.line} />
        </View>

        <Pressable
          onPress={() => setScanning(true)}
          disabled={connecting}
          accessibilityRole="button"
          accessibilityLabel="QR をスキャン"
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Ionicons name="qr-code-outline" size={20} color={PALETTE.accent} />
          <Text style={styles.secondaryText}>QR をスキャン</Text>
        </Pressable>

        {DISCOVERY_AVAILABLE ? (
          <View style={styles.discoverSection}>
            <Text style={styles.discoverHeader}>近くのサーバー</Text>
            {discovered.length === 0 ? (
              <Text style={styles.discoverHint}>同じ Wi-Fi を検索中…</Text>
            ) : (
              discovered.map((svc) => {
                const key = `${svc.host}:${svc.port}`;
                return (
                  <Pressable
                    key={key}
                    onPress={() => handlePickDiscovered(svc)}
                    disabled={connecting}
                    accessibilityRole="button"
                    accessibilityLabel={`${svc.name} (${key}) に接続`}
                    style={({ pressed }) => [
                      styles.discoverItem,
                      pressed && !connecting && styles.pressed,
                    ]}
                  >
                    <Ionicons name="desktop-outline" size={18} color={PALETTE.accent} />
                    <View style={styles.discoverItemBody}>
                      <Text style={styles.discoverItemName}>{svc.name}</Text>
                      <Text style={styles.discoverItemAddr}>{key}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={PALETTE.textFaint} />
                  </Pressable>
                );
              })
            )}
          </View>
        ) : null}

        {hasDownloads ? (
          <Pressable
            onPress={() => router.replace("/")}
            accessibilityRole="button"
            accessibilityLabel="ダウンロード済みを再生（サーバーなし）"
            style={({ pressed }) => [styles.offlineLink, pressed && styles.pressed]}
          >
            <Ionicons name="cloud-offline-outline" size={18} color={PALETTE.textDim} />
            <Text style={styles.offlineLinkText}>ダウンロード済みを再生</Text>
          </Pressable>
        ) : null}
      </View>

      <Modal
        visible={scanning}
        animationType="slide"
        onRequestClose={() => setScanning(false)}
      >
        <QrScanner onScanned={handleScanned} onClose={() => setScanning(false)} />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  brand: {
    alignItems: "center",
    gap: 8,
    marginBottom: 36,
  },
  title: {
    color: PALETTE.text,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: PALETTE.textDim,
    fontSize: 14,
  },
  form: {
    gap: 10,
  },
  fieldLabel: {
    color: PALETTE.textDim,
    fontSize: 13,
    marginTop: 4,
  },
  input: {
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: PALETTE.text,
    fontSize: 16,
  },
  error: {
    color: PALETTE.danger,
    fontSize: 14,
    marginTop: 4,
  },
  primary: {
    marginTop: 12,
    backgroundColor: PALETTE.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: BRAND.accentText,
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: PALETTE.border,
  },
  or: {
    color: PALETTE.textFaint,
    fontSize: 13,
  },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    paddingVertical: 13,
  },
  secondaryText: {
    color: PALETTE.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  discoverSection: {
    marginTop: 20,
    gap: 8,
  },
  discoverHeader: {
    color: PALETTE.textDim,
    fontSize: 13,
    marginBottom: 2,
  },
  discoverHint: {
    color: PALETTE.textFaint,
    fontSize: 13,
    paddingVertical: 6,
  },
  discoverItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  discoverItemBody: {
    flex: 1,
  },
  discoverItemName: {
    color: PALETTE.text,
    fontSize: 15,
    fontWeight: "600",
  },
  discoverItemAddr: {
    color: PALETTE.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  offlineLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  offlineLinkText: {
    color: PALETTE.textDim,
    fontSize: 14,
    fontWeight: "600",
  },
});
