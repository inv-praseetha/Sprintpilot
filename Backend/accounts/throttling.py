from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    """
    Custom IP-based rate throttle class specifically for the authentication view.
    Rate is controlled by the 'auth_limit' setting in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].
    """
    scope = 'auth_limit'

    def get_cache_key(self, request, view):
        # We limit both authenticated and anonymous request attempts by IP address
        return self.get_ident(request)
