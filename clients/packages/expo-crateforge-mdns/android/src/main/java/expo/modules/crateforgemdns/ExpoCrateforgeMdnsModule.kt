package expo.modules.crateforgemdns

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Discovers Crateforge servers advertised over mDNS (`_crateforge._tcp.`) using the
 * platform [NsdManager]. Resolved services are surfaced to JS via the `onServiceFound`
 * event with an already-resolved IP host and port; disappearing services fire
 * `onServiceLost`.
 *
 * All native failures are swallowed (best-effort) so the JS layer can degrade to manual
 * IP entry instead of crashing.
 */
class ExpoCrateforgeMdnsModule : Module() {
  private val context: Context?
    get() = appContext.reactContext

  private var nsdManager: NsdManager? = null
  private var discoveryListener: NsdManager.DiscoveryListener? = null
  private var multicastLock: WifiManager.MulticastLock? = null

  // The legacy NsdManager.resolveService() API can only handle a single in-flight
  // resolve at a time on older Android versions; concurrent calls fail with
  // FAILURE_ALREADY_ACTIVE. Serialize resolves through a simple queue (best-effort).
  private val resolveQueue = ConcurrentLinkedQueue<NsdServiceInfo>()
  private val resolving = AtomicBoolean(false)

  override fun definition() = ModuleDefinition {
    Name("ExpoCrateforgeMdns")

    Events("onServiceFound", "onServiceLost")

    Function("startDiscovery") { type: String ->
      startDiscovery(type)
    }

    Function("stopDiscovery") {
      stopDiscovery()
    }

    OnDestroy {
      stopDiscovery()
    }
  }

  private fun startDiscovery(serviceType: String) {
    // Idempotent: tear down any previous discovery before starting a new one.
    stopDiscovery()

    val manager = context?.getSystemService(Context.NSD_SERVICE) as? NsdManager ?: return
    nsdManager = manager

    acquireMulticastLock()

    val listener = object : NsdManager.DiscoveryListener {
      override fun onStartDiscoveryFailed(serviceType: String?, errorCode: Int) {
        try {
          manager.stopServiceDiscovery(this)
        } catch (_: Throwable) {
        }
        releaseMulticastLock()
      }

      override fun onStopDiscoveryFailed(serviceType: String?, errorCode: Int) {}

      override fun onDiscoveryStarted(serviceType: String?) {}

      override fun onDiscoveryStopped(serviceType: String?) {}

      override fun onServiceFound(serviceInfo: NsdServiceInfo) {
        enqueueResolve(serviceInfo)
      }

      override fun onServiceLost(serviceInfo: NsdServiceInfo) {
        try {
          sendEvent("onServiceLost", mapOf("name" to (serviceInfo.serviceName ?: "")))
        } catch (_: Throwable) {
        }
      }
    }
    discoveryListener = listener

    try {
      manager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, listener)
    } catch (_: Throwable) {
      discoveryListener = null
      releaseMulticastLock()
    }
  }

  private fun stopDiscovery() {
    val manager = nsdManager
    val listener = discoveryListener
    if (manager != null && listener != null) {
      try {
        manager.stopServiceDiscovery(listener)
      } catch (_: Throwable) {
      }
    }
    discoveryListener = null
    resolveQueue.clear()
    resolving.set(false)
    releaseMulticastLock()
  }

  private fun enqueueResolve(serviceInfo: NsdServiceInfo) {
    resolveQueue.add(serviceInfo)
    resolveNext()
  }

  private fun resolveNext() {
    // Ensure only one resolve runs at a time.
    if (!resolving.compareAndSet(false, true)) {
      return
    }

    val manager = nsdManager
    val next = resolveQueue.poll()
    if (manager == null || next == null) {
      resolving.set(false)
      return
    }

    val resolveListener = object : NsdManager.ResolveListener {
      override fun onResolveFailed(serviceInfo: NsdServiceInfo?, errorCode: Int) {
        resolving.set(false)
        resolveNext()
      }

      override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
        try {
          val inetAddress = serviceInfo.host
          if (inetAddress != null) {
            val rawHost = inetAddress.hostAddress ?: return
            val host = if (inetAddress is java.net.Inet6Address) "[$rawHost]" else rawHost
            sendEvent(
              "onServiceFound",
              mapOf(
                "name" to (serviceInfo.serviceName ?: ""),
                "host" to host,
                "port" to serviceInfo.port
              )
            )
          }
        } catch (_: Throwable) {
        } finally {
          resolving.set(false)
          resolveNext()
        }
      }
    }

    try {
      manager.resolveService(next, resolveListener)
    } catch (_: Throwable) {
      resolving.set(false)
      resolveNext()
    }
  }

  private fun acquireMulticastLock() {
    try {
      val wifi = context?.applicationContext?.getSystemService(Context.WIFI_SERVICE) as? WifiManager
      val lock = wifi?.createMulticastLock("crateforge-mdns")
      lock?.setReferenceCounted(true)
      lock?.acquire()
      multicastLock = lock
    } catch (_: Throwable) {
    }
  }

  private fun releaseMulticastLock() {
    try {
      val lock = multicastLock
      if (lock != null && lock.isHeld) {
        lock.release()
      }
    } catch (_: Throwable) {
    } finally {
      multicastLock = null
    }
  }
}
