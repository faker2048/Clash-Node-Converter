
export interface ClashProxy {
  name: string;
  type: string;
  server: string;
  port: number;
  password?: string;
  cipher?: string;
  uuid?: string;
  alterId?: number;
  sni?: string;
  "skip-cert-verify"?: boolean;
  udp?: boolean;
  network?: string;
  tls?: boolean;
  plugin?: string;
  "plugin-opts"?: any;
  "ws-opts"?: any;
  "grpc-opts"?: any;
}

export interface SingBoxOutbound {
  type: string;
  tag: string;
  server: string;
  server_port: number;
  password?: string;
  uuid?: string;
  method?: string;
  tls?: {
    enabled: boolean;
    server_name?: string;
    insecure?: boolean;
  };
  transport?: any;
}

export enum OutputTab {
  SHARE_LINKS = 'SHARE_LINKS',
  SINGBOX_JSON = 'SINGBOX_JSON',
  TABLE = 'TABLE'
}
