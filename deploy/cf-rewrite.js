// CloudFront viewer-request function: map clean/trailing-slash URIs onto the
// static Next.js `output: export` + `trailingSlash: true` tree in S3.
//   /                -> /index.html
//   /en/path/        -> /en/path/index.html
//   /en/path         -> /en/path/index.html   (add missing trailing slash target)
// Requests that already point at a file (have an extension) pass through.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '/index.html';
  }
  return request;
}
