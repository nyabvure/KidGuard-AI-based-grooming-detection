// KidGuard Extension Configuration
// To switch environments, change ENVIRONMENT to 'production'

const KIDGUARD_ENV = 'local'; // 'local' | 'production'

const ENVIRONMENTS = {
  local: {
    BACKEND_URL: 'http://127.0.0.1:8000/api',
    DASHBOARD_URL: 'http://localhost:3000'
  },
  production: {
    BACKEND_URL: 'https://your-production-domain.com/api',
    DASHBOARD_URL: 'https://your-production-domain.com'
  }
};

const CONFIG = ENVIRONMENTS[KIDGUARD_ENV];

// Make config available globally to other scripts
window.KIDGUARD_CONFIG = CONFIG;
