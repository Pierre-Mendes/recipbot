<?php

namespace Tests\Unit\Services;

use App\Exceptions\RecipeScrapingException;
use App\Services\SsrfGuard;
use Tests\Doubles\FakeHostResolver;
use Tests\TestCase;

class SsrfGuardTest extends TestCase
{
    /**
     * @return array<string, array{0: string}>
     */
    public static function blockedIps(): array
    {
        return [
            'RFC1918 10.x' => ['10.0.0.1'],
            'RFC1918 172.16.x' => ['172.16.5.1'],
            'RFC1918 192.168.x' => ['192.168.1.1'],
            'loopback' => ['127.0.0.1'],
            'link-local' => ['169.254.1.1'],
            'IPv6 loopback' => ['::1'],
            'IPv6 unique-local' => ['fd00::1'],
        ];
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function publicIps(): array
    {
        return [
            'public IPv4' => ['203.0.113.10'],
            'public IPv4 2' => ['8.8.8.8'],
            'public IPv6' => ['2606:4700:4700::1111'],
        ];
    }

    /**
     * @dataProvider blockedIps
     */
    public function test_blocks_private_and_reserved_ips(string $ip): void
    {
        $guard = new SsrfGuard(new FakeHostResolver);

        $this->assertTrue($guard->isBlockedIp($ip));
    }

    /**
     * @dataProvider publicIps
     */
    public function test_allows_public_ips(string $ip): void
    {
        $guard = new SsrfGuard(new FakeHostResolver);

        $this->assertFalse($guard->isBlockedIp($ip));
    }

    public function test_rejects_non_whitelisted_domain(): void
    {
        $guard = new SsrfGuard(new FakeHostResolver(['evil.com' => ['203.0.113.10']]));

        $this->expectException(RecipeScrapingException::class);
        $this->expectExceptionMessage('Domain not whitelisted.');

        $guard->assertSafe('https://evil.com/recipe');
    }

    public function test_rejects_non_http_scheme(): void
    {
        $guard = new SsrfGuard(new FakeHostResolver);

        $this->expectException(RecipeScrapingException::class);
        $this->expectExceptionMessage('Only http/https URLs are allowed.');

        $guard->assertSafe('file:///etc/passwd');
    }

    public function test_rejects_whitelisted_domain_that_resolves_to_a_private_ip(): void
    {
        // DNS rebinding: hostname looks fine, but resolves to an internal address.
        $guard = new SsrfGuard(new FakeHostResolver([
            'tudogostoso.com.br' => ['10.0.0.5'],
        ]));

        $this->expectException(RecipeScrapingException::class);
        $this->expectExceptionMessage('Private IP blocked.');

        $guard->assertSafe('https://tudogostoso.com.br/receita/1');
    }

    public function test_rejects_unresolvable_host(): void
    {
        $guard = new SsrfGuard(new FakeHostResolver);

        $this->expectException(RecipeScrapingException::class);
        $this->expectExceptionMessage('Could not resolve host.');

        $guard->assertSafe('https://tudogostoso.com.br/receita/1');
    }

    public function test_allows_whitelisted_domain_with_a_public_ip(): void
    {
        $guard = new SsrfGuard(new FakeHostResolver([
            'tudogostoso.com.br' => ['203.0.113.10'],
        ]));

        $guard->assertSafe('https://tudogostoso.com.br/receita/1');

        $this->addToAssertionCount(1);
    }

    public function test_allows_www_subdomain_of_a_whitelisted_domain(): void
    {
        $guard = new SsrfGuard(new FakeHostResolver([
            'www.tudogostoso.com.br' => ['203.0.113.10'],
        ]));

        $guard->assertSafe('https://www.tudogostoso.com.br/receita/1');

        $this->addToAssertionCount(1);
    }

    public function test_assert_safe_returns_the_resolved_safe_ips(): void
    {
        // RecipeScraperService pins its actual HTTP connection to these IPs,
        // so a caller must be able to rely on assertSafe returning them.
        $guard = new SsrfGuard(new FakeHostResolver([
            'tudogostoso.com.br' => ['203.0.113.10', '203.0.113.11'],
        ]));

        $ips = $guard->assertSafe('https://tudogostoso.com.br/receita/1');

        $this->assertSame(['203.0.113.10', '203.0.113.11'], $ips);
    }
}
