
export const onRequestGet = async (context: any) => {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    // 模拟常见 Clash 客户端的 User-Agent，防止部分机场拒绝非客户端请求
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'ClashforWindows/0.19.0'
      }
    });

    if (!response.ok) {
      return new Response(`Failed to fetch: ${response.statusText}`, { status: response.status });
    }

    const content = await response.text();
    
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
};
