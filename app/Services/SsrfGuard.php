<?php

namespace App\Services;

use App\Contracts\HostResolver;
use App\Exceptions\RecipeScrapingException;

/**
 * SSRF protection for the recipe scraper: only http/https URLs on a small
 * domain whitelist are allowed, and the resolved IP (not just the hostname
 * string) is checked against private/reserved ranges to prevent DNS
 * rebinding from bypassing the whitelist. Callers must pin the actual
 * connection to one of the IPs returned by assertSafe() - re-resolving the
 * hostname independently at fetch time would let DNS change between the
 * check and the request and bypass this guard.
 */
class SsrfGuard
{
    /**
     * @var list<string>
     */
    private readonly array $allowedHosts;

    public function __construct(
        private readonly HostResolver $resolver,
    ) {
        $this->allowedHosts = config('scraper.allowed_hosts', []);
    }

    /**
     * Throws RecipeScrapingException if the URL is not safe to fetch.
     * Returns the resolved, validated IPs so the caller can pin the actual
     * HTTP connection to one of them - re-resolving the hostname at fetch
     * time would let DNS rebinding bypass this check entirely.
     *
     * @return list<string>
     */
    public function assertSafe(string $url): array
    {
        $parts = parse_url($url);

        if ($parts === false) {
            throw new RecipeScrapingException('Invalid URL.');
        }

        $scheme = strtolower($parts['scheme'] ?? '');
        if (! in_array($scheme, ['http', 'https'], true)) {
            throw new RecipeScrapingException('Only http/https URLs are allowed.');
        }

        if (empty($parts['host'])) {
            throw new RecipeScrapingException('Invalid URL.');
        }

        $host = strtolower($parts['host']);
        $bareHost = preg_replace('/^www\./', '', $host);
        if (! in_array($bareHost, $this->allowedHosts, true)) {
            throw new RecipeScrapingException('Domain not whitelisted.');
        }

        $ips = $this->resolver->resolve($host);
        if ($ips === []) {
            throw new RecipeScrapingException('Could not resolve host.');
        }

        foreach ($ips as $ip) {
            if ($this->isBlockedIp($ip)) {
                throw new RecipeScrapingException('Private IP blocked.');
            }
        }

        return $ips;
    }

    /**
     * True if the IP is in a private, reserved, loopback, or link-local
     * range (RFC1918, RFC3927, etc.) - covers both IPv4 and IPv6 via PHP's
     * built-in filter flags, so no hand-rolled CIDR math is needed.
     */
    public function isBlockedIp(string $ip): bool
    {
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
    }
}
