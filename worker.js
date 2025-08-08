export default {
  async fetch(request, env) {
    console.log(request);
    const url = new URL(request.url);
    
    // Handle POST /upload
    if (request.method === 'POST' && url.pathname === '/upload') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const key = formData.get('key');
        
        if (!file || !key) {
          return new Response('Missing file or key', { status: 400 });
        }
        
        // Forward file to IPFS service
        const ipfsFormData = new FormData();
        ipfsFormData.append('file', file);
        
        const ipfsResponse = await fetch(`${env.URL}/upload`, {
          method: 'POST',
          body: ipfsFormData
        });
        
        if (!ipfsResponse.ok) {
          return new Response('IPFS upload failed', { status: 501 });
        }
        
        const ipfsData = await ipfsResponse.json();
        const web2url = ipfsData.web2url;
        
        // Store key-cid pair in KV
        await env.kv.put(key, web2url);
        
        return new Response(JSON.stringify({
          status: 'ok',
          web2url,
          key
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error(error);
        return new Response(error.message, { status: 500 });
      }
    }
    
    // Handle GET requests (redirect if key exists)
    if (request.method === 'GET') {
      if (url.pathname === '/') {
        return new Response('zzc', {
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      const path = url.pathname.slice(1); // Remove leading '/'
      const web2url = await env.kv.get(path);
      
      if (web2url) {
        return Response.redirect(web2url, 302);
      }
    }
    
    return new Response('Not found', { status: 404 });
  }
};
