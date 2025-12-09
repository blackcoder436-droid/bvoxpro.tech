/**
 * Frontend API Client
 * Provides JavaScript functions to communicate with the database API
 * Include this file in your HTML: <script src="/js/api-client.js"></script>
 */

const API = {
    baseUrl: window.location.origin,
    
    // Helper function to make API calls
    async request(method, endpoint, data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },

    // ============= USER API =============
    
    users: {
        getById: (userId) => API.request('GET', `/api/users/${userId}`),
        getAll: (limit = 100, skip = 0) => API.request('GET', `/api/users?limit=${limit}&skip=${skip}`),
        updateBalance: (userId, balance) => API.request('PUT', `/api/users/${userId}/balance`, { balance }),
        updateBalances: (userId, balances) => API.request('PUT', `/api/users/${userId}/balances`, { balances })
    },

    // ============= TOPUP API =============
    
    topup: {
        create: (data) => API.request('POST', '/api/topup', data),
        getRecords: (userId, limit = 50) => API.request('GET', `/api/topup/${userId}?limit=${limit}`),
        updateStatus: (topupId, status) => API.request('PUT', `/api/topup/${topupId}/status`, { status })
    },

    // ============= WITHDRAWAL API =============
    
    withdrawal: {
        create: (data) => API.request('POST', '/api/withdrawal', data),
        getRecords: (userId, limit = 50) => API.request('GET', `/api/withdrawal/${userId}?limit=${limit}`),
        updateStatus: (withdrawalId, status, txhash = null) => {
            const body = { status };
            if (txhash) body.txhash = txhash;
            return API.request('PUT', `/api/withdrawal/${withdrawalId}/status`, body);
        }
    },

    // ============= EXCHANGE API =============
    
    exchange: {
        create: (data) => API.request('POST', '/api/exchange', data),
        getRecords: (userId, limit = 50) => API.request('GET', `/api/exchange/${userId}?limit=${limit}`)
    },

    // ============= TRADE API =============
    
    trade: {
        create: (data) => API.request('POST', '/api/trade', data),
        getRecords: (userId, limit = 50, status = null) => {
            let url = `/api/trade/${userId}?limit=${limit}`;
            if (status) url += `&status=${status}`;
            return API.request('GET', url);
        },
        close: (tradeId, exitPrice, pnl) => API.request('PUT', `/api/trade/${tradeId}/close`, { exit_price: exitPrice, pnl })
    },

    // ============= MINING API =============
    
    mining: {
        create: (data) => API.request('POST', '/api/mining', data),
        getRecords: (userId) => API.request('GET', `/api/mining/${userId}`),
        claimRewards: (miningId, earned, totalEarned) => API.request('PUT', `/api/mining/${miningId}/claim`, { earned, total_earned: totalEarned })
    },

    // ============= LOAN API =============
    
    loan: {
        create: (data) => API.request('POST', '/api/loan', data),
        getRecords: (userId) => API.request('GET', `/api/loan/${userId}`)
    },

    // ============= WALLET API =============
    
    wallet: {
        create: (data) => API.request('POST', '/api/wallet', data),
        getByUserId: (userId) => API.request('GET', `/api/wallet/${userId}`),
        getByAddress: (address) => API.request('GET', `/api/wallet/address/${address}`)
    },

    // ============= KYC API =============
    
    kyc: {
        submit: (data) => API.request('POST', '/api/kyc', data),
        getStatus: (userId) => API.request('GET', `/api/kyc/${userId}`),
        verify: (userId, status, rejectionReason = null) => {
            const body = { status };
            if (rejectionReason) body.rejectionReason = rejectionReason;
            return API.request('PUT', `/api/kyc/${userId}/verify`, body);
        }
    },

    // ============= ARBITRAGE API =============
    
    arbitrage: {
        getProducts: (limit = 20) => API.request('GET', `/api/arbitrage/products?limit=${limit}`),
        subscribe: (data) => API.request('POST', '/api/arbitrage/subscribe', data),
        getSubscriptions: (userId) => API.request('GET', `/api/arbitrage/${userId}`),
        claimPayout: (subscriptionId, earned) => API.request('PUT', `/api/arbitrage/${subscriptionId}/payout`, { earned })
    },

    // ============= NOTIFICATION API =============
    
    notification: {
        create: (data) => API.request('POST', '/api/notification', data),
        get: (userId, limit = 20) => API.request('GET', `/api/notification/${userId}?limit=${limit}`),
        markAsRead: (notificationId) => API.request('PUT', `/api/notification/${notificationId}/read`, {})
    }
};

// Make API globally available
window.API = API;
