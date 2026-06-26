// Crateforge TV ペアリング画面。
// TV にはカメラがないため QR ではなく数字コード入力でペアリングする。
// 1. デスクトップの IP:port を入力
// 2. "ペアリング開始" → POST /api/pair/start → コードを大きく表示
// 3. ユーザーがデスクトップ側「設定→API→端末を承認」にコードを入力
// 4. GET /api/pair/poll をポーリングして approved になったら接続完了

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Device from "expo-device";
import {
  isAvailable as mdnsIsAvailable,
  startDiscovery,
  stopDiscovery,
  addServiceFoundListener,
  type DiscoveredService,
} from "expo-crateforge-mdns";

import { ApiClient, useConnection } from "@crateforge/core";
import { PALETTE, TV_FONT, FOCUS_RING } from "@/theme/palette";

type Phase = "input" | "polling" | "error";

// ネイティブ mDNS モジュールが使えるか（Expo Go / web / 旧 dev build では false）。
// false のときは探索 UI を出さず、従来どおり IP:port の手入力のみで動かす。
const DISCOVERY_AVAILABLE = mdnsIsAvailable();

// Android TV の Gboard は全角固定になりがちで、IP:port が全角で入力されると接続に失敗する。
// 入力時に全角英数字/記号（U+FF01..U+FF5E）と全角スペース（U+3000）を半角へ正規化する。
function toHalfWidth(s: string): string {
  return s
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}

export default function ConnectScreen() {
  const [address, setAddress] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [code, setCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [addressFocused, setAddressFocused] = useState(false);
  const [btnFocused, setBtnFocused] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredService[]>([]);
  const [discoveredFocusKey, setDiscoveredFocusKey] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clientRef = useRef<ApiClient | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // mDNS 探索: フォームが出ている間（polling 以外）だけ走らせる。
  // ネイティブが無ければ何もしない（startDiscovery 等は no-op）。
  // polling に入ると cleanup で stopDiscovery され、戻ると再開する。
  useEffect(() => {
    if (!DISCOVERY_AVAILABLE || phase === "polling") return;
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
  }, [phase]);

  const startPairing = useCallback(
    async (rawAddress: string) => {
      const trimmed = rawAddress.trim();
      if (!trimmed) {
        setErrorMsg("デスクトップの IP:port を入力してください（例: 192.168.1.10:8787）");
        setPhase("error");
        return;
      }

      setPhase("polling");
      setErrorMsg(null);

      try {
        const client = new ApiClient({ baseUrl: trimmed, token: null });
        clientRef.current = client;
        const deviceName = Device.deviceName ?? Device.modelName ?? "Android TV";
        const { session, code: pairingCode } = await client.pairStart(deviceName, "android-tv");
        sessionRef.current = session;
        setCode(pairingCode);

        // 2秒ごとにポーリング
        pollTimerRef.current = setInterval(async () => {
          try {
            if (!sessionRef.current || !clientRef.current) return;
            const res = await clientRef.current.pairPoll(sessionRef.current);
            if (res.status === "approved" && res.token != null) {
              stopPolling();
              await useConnection.getState().connect(trimmed, res.token);
              // Gate が / へリダイレクトする
            } else if (res.status === "expired") {
              stopPolling();
              setPhase("error");
              setErrorMsg("コードが期限切れになりました。もう一度お試しください。");
              setCode(null);
            }
          } catch (e) {
            stopPolling();
            setPhase("error");
            setErrorMsg(e instanceof Error ? e.message : "ポーリングエラー");
            setCode(null);
          }
        }, 2000);
      } catch (e) {
        setPhase("error");
        setErrorMsg(e instanceof Error ? e.message : "接続できませんでした");
      }
    },
    [stopPolling],
  );

  const handleStart = useCallback(() => {
    void startPairing(address);
  }, [address, startPairing]);

  // 探索結果を選んだら探索を止め、その IP:port でペアリングを開始する。
  const handlePickDiscovered = useCallback(
    (svc: DiscoveredService) => {
      const addr = `${svc.host}:${svc.port}`;
      stopDiscovery();
      setAddress(addr);
      void startPairing(addr);
    },
    [startPairing],
  );

  const handleRetry = useCallback(() => {
    stopPolling();
    setPhase("input");
    setCode(null);
    setErrorMsg(null);
    setDiscovered([]);
    sessionRef.current = null;
    clientRef.current = null;
  }, [stopPolling]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Crateforge TV</Text>
        <Text style={styles.subtitle}>デスクトップとペアリング</Text>

        {phase !== "polling" && (
          <>
            <Text style={styles.label}>デスクトップの IP:port</Text>
            <TextInput
              style={[styles.input, addressFocused && FOCUS_RING]}
              value={address}
              onChangeText={(t) => setAddress(toHalfWidth(t))}
              placeholder="192.168.1.10:8787"
              placeholderTextColor={PALETTE.textSub}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setAddressFocused(true)}
              onBlur={() => setAddressFocused(false)}
            />
            <Pressable
              style={[styles.button, btnFocused && styles.buttonFocused]}
              onPress={handleStart}
              onFocus={() => setBtnFocused(true)}
              onBlur={() => setBtnFocused(false)}
              hasTVPreferredFocus
            >
              <Text style={styles.buttonText}>ペアリング開始</Text>
            </Pressable>

            {DISCOVERY_AVAILABLE && (
              <View style={styles.discoverBox}>
                <Text style={styles.discoverLabel}>近くのサーバー</Text>
                {discovered.length === 0 ? (
                  <Text style={styles.discoverHint}>同じ LAN を検索中…</Text>
                ) : (
                  discovered.map((svc) => {
                    const key = `${svc.host}:${svc.port}`;
                    const focused = discoveredFocusKey === key;
                    return (
                      <Pressable
                        key={key}
                        style={[styles.discoverItem, focused && styles.discoverItemFocused]}
                        onPress={() => handlePickDiscovered(svc)}
                        onFocus={() => setDiscoveredFocusKey(key)}
                        onBlur={() =>
                          setDiscoveredFocusKey((k) => (k === key ? null : k))
                        }
                      >
                        <Text style={styles.discoverItemName}>{svc.name}</Text>
                        <Text style={styles.discoverItemAddr}>{key}</Text>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}

        {phase === "polling" && code && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>デスクトップで承認してください</Text>
            <Text style={styles.code}>{code}</Text>
            <Text style={styles.codeInstructions}>
              デスクトップの{"\n"}「設定 → API → 端末を承認」に{"\n"}このコードを入力してください
            </Text>
            <ActivityIndicator color={PALETTE.teal} size="large" style={{ marginTop: 32 }} />
            <Text style={styles.polling}>承認待ち中…</Text>
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleRetry}>
              <Text style={styles.buttonText}>やり直す</Text>
            </Pressable>
          </View>
        )}

        {phase === "error" && errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Pressable
              style={[styles.button, btnFocused && styles.buttonFocused]}
              onPress={handleRetry}
              onFocus={() => setBtnFocused(true)}
              onBlur={() => setBtnFocused(false)}
              hasTVPreferredFocus
            >
              <Text style={styles.buttonText}>もう一度試す</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 64,
  },
  title: {
    fontSize: TV_FONT.hero,
    fontWeight: "700",
    color: PALETTE.teal,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: TV_FONT.md,
    color: PALETTE.textSub,
    marginBottom: 64,
  },
  label: {
    fontSize: TV_FONT.sm,
    color: PALETTE.text,
    alignSelf: "flex-start",
    marginBottom: 8,
    width: "100%",
    maxWidth: 600,
  },
  input: {
    width: "100%",
    maxWidth: 600,
    backgroundColor: PALETTE.surface,
    color: PALETTE.text,
    fontSize: TV_FONT.md,
    padding: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: PALETTE.border,
    marginBottom: 32,
  },
  button: {
    backgroundColor: PALETTE.teal,
    paddingVertical: 20,
    paddingHorizontal: 64,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 3,
    borderColor: "transparent",
  },
  buttonFocused: {
    borderColor: PALETTE.text,
    backgroundColor: "#4A8BA5",
  },
  secondaryButton: {
    backgroundColor: PALETTE.surface,
    marginTop: 24,
  },
  buttonText: {
    color: PALETTE.text,
    fontSize: TV_FONT.md,
    fontWeight: "600",
    textAlign: "center",
  },
  codeBox: {
    alignItems: "center",
    gap: 16,
  },
  codeLabel: {
    fontSize: TV_FONT.md,
    color: PALETTE.textSub,
    marginBottom: 8,
  },
  code: {
    fontSize: TV_FONT.hero,
    fontWeight: "900",
    color: PALETTE.teal,
    letterSpacing: 16,
    fontVariant: ["tabular-nums"],
  },
  codeInstructions: {
    fontSize: TV_FONT.sm,
    color: PALETTE.text,
    textAlign: "center",
    lineHeight: 36,
  },
  polling: {
    fontSize: TV_FONT.sm,
    color: PALETTE.textSub,
    marginTop: 8,
  },
  discoverBox: {
    width: "100%",
    maxWidth: 600,
    marginTop: 40,
    gap: 12,
  },
  discoverLabel: {
    fontSize: TV_FONT.sm,
    color: PALETTE.textSub,
  },
  discoverHint: {
    fontSize: TV_FONT.sm,
    color: PALETTE.textSub,
    paddingVertical: 12,
  },
  discoverItem: {
    backgroundColor: PALETTE.surface,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "transparent",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  discoverItemFocused: {
    borderColor: PALETTE.teal,
    backgroundColor: PALETTE.focusBg,
  },
  discoverItemName: {
    fontSize: TV_FONT.md,
    color: PALETTE.text,
    fontWeight: "600",
  },
  discoverItemAddr: {
    fontSize: TV_FONT.xs,
    color: PALETTE.textSub,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  errorBox: {
    alignItems: "center",
    gap: 24,
  },
  errorText: {
    fontSize: TV_FONT.sm,
    color: "#E57373",
    textAlign: "center",
    maxWidth: 600,
  },
});
