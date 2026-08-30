<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>RecipBot API Docs</title>
    <link rel="icon" type="image/png" href="{{ asset('vendor/swagger-ui/favicon-32x32.png') }}" sizes="32x32">
    <link rel="stylesheet" href="{{ asset('vendor/swagger-ui/swagger-ui.css') }}">
</head>
<body>
<div id="swagger-ui"></div>
<script src="{{ asset('vendor/swagger-ui/swagger-ui-bundle.js') }}"></script>
<script>
    window.onload = function () {
        window.SwaggerUIBundle({
            url: "{{ url('/docs/openapi.yaml') }}",
            dom_id: '#swagger-ui',
            presets: [SwaggerUIBundle.presets.apis],
        });
    };
</script>
</body>
</html>
