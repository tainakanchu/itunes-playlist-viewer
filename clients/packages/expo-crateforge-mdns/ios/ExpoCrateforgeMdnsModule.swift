import ExpoModulesCore
import Foundation

/// Discovers Crateforge servers advertised over mDNS (`_crateforge._tcp.`) using
/// `NetServiceBrowser`. Resolved services are surfaced to JS via the `onServiceFound`
/// event with an already-resolved IPv4 host and port; disappearing services fire
/// `onServiceLost`.
///
/// `NetService`/`NetServiceBrowser` are deprecated since iOS 15 but remain functional
/// and keep host/port extraction simple. `NWBrowser` is the modern replacement but
/// requires resolving `NWEndpoint`s manually before host/port are available.
///
/// All Bonjour work is pinned to the main run loop: `NetServiceBrowser`/`NetService`
/// deliver their delegate callbacks on the run loop they were scheduled on, and the
/// main run loop is always running. Keeping every touchpoint on main also makes access
/// to `browser` / `resolvingServices` single-threaded.
public final class ExpoCrateforgeMdnsModule: Module, NetServiceBrowserDelegate, NetServiceDelegate {
  private var browser: NetServiceBrowser?

  // Hold strong references to services while they resolve; otherwise ARC may
  // deallocate them before `netServiceDidResolveAddress(_:)` fires.
  private var resolvingServices: [NetService] = []

  public func definition() -> ModuleDefinition {
    Name("ExpoCrateforgeMdns")

    Events("onServiceFound", "onServiceLost")

    Function("startDiscovery") { (type: String) in
      DispatchQueue.main.async { [weak self] in
        self?.startDiscoveryInternal(type: type)
      }
    }

    Function("stopDiscovery") {
      DispatchQueue.main.async { [weak self] in
        self?.stopDiscoveryInternal()
      }
    }

    OnDestroy {
      DispatchQueue.main.async { [weak self] in
        self?.stopDiscoveryInternal()
      }
    }
  }

  // MARK: - Discovery lifecycle (main thread only)

  private func startDiscoveryInternal(type: String) {
    // Idempotent: tear down any previous browse first.
    stopDiscoveryInternal()

    let browser = NetServiceBrowser()
    browser.delegate = self
    self.browser = browser
    browser.searchForServices(ofType: type, inDomain: "local.")
  }

  private func stopDiscoveryInternal() {
    browser?.stop()
    browser?.delegate = nil
    browser = nil

    for service in resolvingServices {
      service.stop()
      service.delegate = nil
    }
    resolvingServices.removeAll()
  }

  private func removeResolving(_ service: NetService) {
    service.delegate = nil
    resolvingServices.removeAll { $0 === service }
  }

  // MARK: - NetServiceBrowserDelegate

  public func netServiceBrowser(
    _ browser: NetServiceBrowser,
    didFind service: NetService,
    moreComing: Bool
  ) {
    service.delegate = self
    resolvingServices.append(service)
    service.resolve(withTimeout: 5)
  }

  public func netServiceBrowser(
    _ browser: NetServiceBrowser,
    didRemove service: NetService,
    moreComing: Bool
  ) {
    sendEvent("onServiceLost", ["name": service.name])
    removeResolving(service)
  }

  // MARK: - NetServiceDelegate

  public func netServiceDidResolveAddress(_ sender: NetService) {
    guard let host = firstIPv4Address(of: sender) else {
      removeResolving(sender)
      return
    }
    sendEvent(
      "onServiceFound",
      [
        "name": sender.name,
        "host": host,
        "port": sender.port
      ]
    )
    removeResolving(sender)
  }

  public func netService(_ sender: NetService, didNotResolve errorDict: [String: NSNumber]) {
    removeResolving(sender)
  }

  // MARK: - Helpers

  private func firstIPv4Address(of service: NetService) -> String? {
    guard let addresses = service.addresses else {
      return nil
    }
    for data in addresses {
      let resolved: String? = data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) -> String? in
        guard let base = raw.baseAddress else {
          return nil
        }
        let storage = base.assumingMemoryBound(to: sockaddr.self)
        guard storage.pointee.sa_family == sa_family_t(AF_INET) else {
          return nil
        }
        var addr = base.assumingMemoryBound(to: sockaddr_in.self).pointee
        var buffer = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
        inet_ntop(AF_INET, &addr.sin_addr, &buffer, socklen_t(INET_ADDRSTRLEN))
        return String(cString: buffer)
      }
      if let resolved {
        return resolved
      }
    }
    return nil
  }
}
