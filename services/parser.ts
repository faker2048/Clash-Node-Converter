
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
      const doc = jsYaml.load(content) as any;
      if (doc && Array.isArray(doc.proxies)) {
        return doc.proxies;
      }
      
      // Attempt to extract from a simple list format if it's just the proxy list
      if (Array.isArray(doc)) {
         return doc;
      }

      // Final fallback: Regex for the format provided in the prompt
      const proxyMatches = content.matchAll(/-\s*\{(.*?)\}/g);
      const proxies: ClashProxy[] = [];
      
      for (const match of proxyMatches) {
        try {
          const parts = match[1].split(',').reduce((acc: any, part) => {
            const [key, ...valueParts] = part.split(':');
            const value = valueParts.join(':').trim();
            const cleanKey = key.trim();
            
            if (value === 'true') acc[cleanKey] = true;
            else if (value === 'false') acc[cleanKey] = false;
            else if (!isNaN(Number(value)) && cleanKey === 'port') acc[cleanKey] = Number(value);
            else acc[cleanKey] = value.replace(/^["']|["']$/g, ''); 
            
            return acc;
          }, {});
          
          if (parts.name && parts.server) {
            proxies.push(parts as ClashProxy);
          }
        } catch (err) {
          console.error("Failed to parse individual proxy line:", match[0]);
        }
      }

      return proxies;
    } catch (e) {
      console.error("YAML Parse Error:", e);
      throw new Error("Could not parse Clash configuration. Please check your format.");
    }
  }

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
