<?php

$origins = array_filter([
    env('FRONTEND_URL'),
    env('APP_ENV') === 'local' ? 'http://localhost:5173' : null,
]);

return [
    'paths'                    => ['api/*'],
    'allowed_methods'          => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins'          => array_values($origins),
    'allowed_origins_patterns' => [],
    'allowed_headers'          => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    'exposed_headers'          => [],
    'max_age'                  => 0,
    'supports_credentials'     => false,
];
