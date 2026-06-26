/**
 * A Crateforge server discovered on the local network via mDNS.
 *
 * - `name`: the mDNS service instance name (e.g. "Crateforge").
 * - `host`: the resolved IP address (IPv4) the server is reachable at.
 * - `port`: the TCP port the HTTP API is bound to.
 */
export type DiscoveredService = {
  name: string;
  host: string;
  port: number;
};
