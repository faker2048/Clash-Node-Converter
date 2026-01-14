import { ClashProxy, SingBoxOutbound } from '../types';
import jsYaml from 'js-yaml';

export class ParserService {
  /**
   * Parses raw YAML or base64 encoded YAML string from Clash configuration
   */
  static parseClashConfig(input: string): ClashProxy[] {
    let content = input.trim();

    // Handle base64 encoded subscriptions
    if (!content.includes('proxies:') && !content.includes('- {')) {
      try {
        content = atob(content);
      } catch (e) {
        // Not base64, proceed as raw
      }
    }

    try {
      // First, try standard YAML parsing
      const doc = jsYaml.load(content) as any;
      if (doc && Array.isArray(doc.proxies)) {
        return doc.proxies;
      }
      
      // Attempt to extract from a simple list format if it's just the proxy list
      if (Array.isArray(doc)) {
         return doc;
      }
      
      throw new Error("YAML structure not recognized");
    } catch (yamlErr) {
      // Fallback: Manual parsing for messy or partial inputs
      // This regex matches: - { key: value, key2: "val,ue", ... }
      const proxyMatches = content.matchAll(/-\s*\{(.*?)\}/g);
      const proxies: ClashProxy[] = [];
      
      for (const match of proxyMatches) {
        try {
          const rawObjStr = match[1];
          // Match key: value pairs, handling optional quotes around values
          const propertyRegex = /([a-zA-Z0-9_-]+)\s*:\s*(?:(["'])(.*?)\2|([^,]+))/g;
          const propMatches = rawObjStr.matchAll(propertyRegex);
          
          const obj: any = {};
          let foundProps = false;

          for (const m of propMatches) {
             const key = m[1].trim();
             // m[3] is quoted value content, m[4] is unquoted value
             const value = (m[3] !== undefined ? m[3] : m[4] || '').trim();
             
             foundProps = true;

             // Basic type conversion
             if (value === 'true') obj[key] = true;
             else if (value === 'false') obj[key] = false;
             else if (!isNaN(Number(value)) && (key === 'port' || key === 'alterId' || key === 'udp')) obj[key] = Number(value);
             else obj[key] = value;
          }
          
          if (foundProps && obj.name && obj.server) {
            proxies.push(obj as ClashProxy);
          }
        } catch (err) {
          console.error("Failed to parse individual proxy line:", match[0]);
        }
      }

      if (proxies.length > 0) {
        return proxies;
      }

      console.error("Parse Error:", yamlErr);
      throw new Error("Could not parse Clash configuration. Please check your format.");
    }
  }

  /**
   * Converts a Clash proxy to a standard Share Link (e.g., trojan://)
   */
  static toShareLink(p: ClashProxy): string {
    const nameEncoded = encodeURIComponent(p.name);
    
    switch (p.type.toLowerCase()) {
      case 'trojan':
        const trojanParams = new URLSearchParams();
        if (p.sni) trojanParams.set('sni', p.sni);
        if (p['skip-cert-verify']) trojanParams.set('allowInsecure', '1');
        if (p.udp) trojanParams.set('udp', '1');
        return `trojan://${p.password}@${p.server}:${p.port}?${trojanParams.toString()}#${nameEncoded}`;
      
      case 'ss':
      case 'shadowsocks':
        const ssInfo = btoa(`${p.cipher}:${p.password}`);
        return `ss://${ssInfo}@${p.server}:${p.port}#${nameEncoded}`;
        
      case 'vmess':
        const vmessObj = {
          v: "2",
          ps: p.name,
          add: p.server,
          port: p.port,
          id: p.uuid,
          aid: p.alterId || 0,
          net: p.network || "tcp",
          type: "none",
          host: p.sni || "",
          path: "",
          tls: p.tls ? "tls" : ""
        };
        return `vmess://${btoa(JSON.stringify(vmessObj))}`;
        
      default:
        return `unsupported://${p.type}@${p.server}:${p.port}#${nameEncoded}`;
    }
  }

  /**
   * Converts a Clash proxy to a Sing-box Outbound JSON object
   */
  static toSingBoxOutbound(p: ClashProxy): SingBoxOutbound {
    const type = p.type.toLowerCase() === 'ss' ? 'shadowsocks' : p.type.toLowerCase();
    
    const outbound: any = {
      type: type,
      tag: p.name,
      server: p.server,
      server_port: p.port,
    };

    if (p.password) outbound.password = p.password;
    if (p.uuid) outbound.uuid = p.uuid;
    if (p.cipher) outbound.method = p.cipher;

    if (p.type.toLowerCase() === 'trojan' || p.tls || p.sni) {
      outbound.tls = {
        enabled: true,
        server_name: p.sni || p.server,
        insecure: !!p['skip-cert-verify']
      };
    }

    // Handle transport (WS/gRPC) if needed
    if (p.network === 'ws') {
      outbound.transport = {
        type: 'ws',
        path: p['ws-opts']?.path || '/',
        headers: p['ws-opts']?.headers || {}
      };
    }

    return outbound;
  }
}