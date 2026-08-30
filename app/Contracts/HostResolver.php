<?php

namespace App\Contracts;

interface HostResolver
{
    /**
     * Resolve a hostname to its IP addresses (IPv4 and IPv6).
     *
     * @return list<string>
     */
    public function resolve(string $host): array;
}
