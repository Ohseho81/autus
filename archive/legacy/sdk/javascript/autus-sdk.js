class AUTUS {
    constructor(baseUrl = "https://autus-production.up.railway.app") {
        this.baseUrl = baseUrl;
    }

    async request(path, options = {}) {
        const response = await fetch(`${this.baseUrl}${path}`, {
            headers: { "Content-Type": "application/json" },
            ...options
        });
        return response.json();
    }

    async health() {
        return this.request("/health");
    }

    async getUniverse() {
        return this.request("/universe/overview");
    }

    async getTwin(zeroId) {
        return this.request(`/twin/user/${zeroId}`);
    }

    async getCity(cityId) {
        return this.request(`/twin/city/${cityId}`);
    }

    async registerDevice(deviceId, name, type) {
        return this.request("/devices/register", {
            method: "POST",
            body: JSON.stringify({ id: deviceId, name, type })
        });
    }

    async sendDeviceData(deviceId, data) {
        return this.request(`/devices/${deviceId}/data`, {
            method: "POST",
            body: JSON.stringify(data)
        });
    }

    async getAnalytics() {
        return this.request("/analytics/stats");
    }

    async trackEvent(event, data = {}) {
        return this.request(`/analytics/track?event=${event}`, {
            method: "POST",
            body: JSON.stringify(data)
        });
    }
}

module.exports = AUTUS;
