<?php

namespace App\Services;

use App\Contracts\HostResolver;
use App\Exceptions\RecipeScrapingException;

/**
 * SSRF protection for the recipe scraper: only http/https URLs on a small
 * domain whitelist are allowed, and the resolved IP (not just the hostname
 * string) is checked against private/reserved ranges to prevent DNS
 * rebinding from bypassing the whitelist.
 */
class SsrfGuard
{
    /**
     * @var list<string>
     */
    private const ALLOWED_HOSTS = [
        'tudogostoso.com.br',
        'www.tudogostoso.com.br',
        'cybercook.com.br',
        'www.cybercook.com.br',
        'receitas.globo.com',
        'www.receitas.globo.com',
    ];

    public function __construct(
        private readonly HostResolver $resolver,
    ) {}

    /**
     * Throws RecipeScrapingException if the URL is not safe to fetch.
     */
    public function assertSafe(string $url): void
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
        if (! in_array($host, self::ALLOWED_HOSTS, true)) {
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
