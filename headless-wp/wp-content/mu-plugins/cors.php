<?php
/**
 * Plugin Name: Headless CORS (Dev)
 */

add_action('rest_api_init', function () {
  remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');

  add_filter('rest_pre_serve_request', function ($value) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ];

    if (in_array($origin, $allowed, true)) {
      header("Access-Control-Allow-Origin: $origin");
      header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
      status_header(200);
      exit;
    }

    return $value;
  }, 10);
}, 15);
