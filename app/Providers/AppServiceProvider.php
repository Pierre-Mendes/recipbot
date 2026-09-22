<?php

namespace App\Providers;

use App\Contracts\HostResolver;
use App\Services\DnsHostResolver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(HostResolver::class, DnsHostResolver::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Mass-assignment hardening: throw (instead of silently dropping) when
        // a request tries to fill an attribute that is not in a model's
        // $fillable list. Enforced in every environment so an unexpected key
        // can never be quietly ignored.
        Model::preventSilentlyDiscardingAttributes();

        // The remaining strict-mode guards (lazy-loading and accessing missing
        // attributes) surface developer mistakes but should never turn a real
        // user request into a 500 in production, so they run outside prod only.
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventAccessingMissingAttributes(! $this->app->isProduction());
    }
}
