<?php

namespace Tests\Doubles;

use App\Contracts\HostResolver;

/**
 * Deterministic stand-in for real DNS resolution, so SSRF tests don't
 * depend on network access or the whitelisted domains' actual DNS records.
 */
class FakeHostResolver implements HostResolver
{
    /**
     * @param  array<string, list<string>>  $map  host => IPs
     */
    public function __construct(
        private readonly array $map = [],
    ) {}

    /**
     * @return list<string>
     */
    public function resolve(string $host): array
    {
        return $this->map[$host] ?? [];
    }
}
