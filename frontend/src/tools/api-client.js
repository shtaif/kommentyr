import axios from 'axios';


const apiClientSingleton = {
    apiBaseUrl: null,


    setApiBaseUrl(url) {
        this.apiBaseUrl = url;
    },


    async fetch(serviceName, queryParams={}) {
        try {
            let response = await axios.get(this.apiBaseUrl+'/'+serviceName, {
                params: queryParams,
                withCredentials: true
            });
            return response.data.data;
        }
        catch (err) {
            throw err;
        }
    },


    async fetchOne(serviceName, queryParams={}) {
        queryParams.limit = 1; // Override limit to a single item
        let result = await this.fetch(serviceName, queryParams);
        return result.length? result[0] : null;
    },


    async create(serviceName, payloadObject={}) {
        try {
            let response = await axios.post(
                this.apiBaseUrl+'/'+serviceName,
                payloadObject,
                {
                    headers: {'content-type': 'application/json'},
                    withCredentials: true
                }
            );
            return response.data.data;
        }
        catch (err) {
            throw err;
        }
    },


    async signup(email, password) {
        try {
            let response = await axios.post(
                this.apiBaseUrl+'/auth/signup',
                { email: email, password: password },
                {
                    headers: {'content-type': 'application/json'},
                    withCredentials: true
                }
            );
            return response.data.data;
        }
        catch (err) {
            throw err;
        }
    },


    async signin(email, password) {
        try {
            let response = await axios.put(
                this.apiBaseUrl+'/auth/signin',
                { email: email, password: password },
                {
                    headers: {'content-type': 'application/json'},
                    withCredentials: true
                }
            );
            return response.data.data;
        }
        catch (err) {
            throw err;
        }
    },


    async signout() {
        try {
            let response = await axios.put(this.apiBaseUrl+'/auth/signout', {}, {
                headers: {'content-type': 'application/json'},
                withCredentials: true
            });
            return response.data.data;
        }
        catch (err) {
            throw err;
        }
    }
};


export default apiClientSingleton;
