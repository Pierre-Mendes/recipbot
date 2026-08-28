<?php

namespace App\Services;

use App\Contracts\HostResolver;

/**
 * Real DNS resolution via PHP's built-in functions. Kept separate from
 * SsrfGuard so tests can substitute a fake resolver instead of depending
 * on real network/DNS access.
 */
class DnsHostResolver implements HostResolver
{
    /**
     * @return list<string>
     */
    public function resolve(string $host): array
    {
        $ips = [];

        $ipv4 = @gethostbynamel($host);
        if (is_array($ipv4)) {
            $ips = array_merge($ips, $ipv4);
        }

        $aaaaRecords = @dns_get_record($host, DNS_AAAA) ?: [];
        foreach ($aaaaRecords as $record) {
            if (! empty($record['ipv6'])) {
                $ips[] = $record['ipv6'];
            }
        }

        return array_values(array_unique($ips));
    }
}
