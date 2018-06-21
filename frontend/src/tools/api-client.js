import axios from 'axios';


const apiClientSingleton = {
    apiBaseUrl: null,


    setApiBaseUrl(url) {
        this.apiBaseUrl = url;
    },


    async fetch(serviceName, queryParams={}) {
        try {
            let response = await axios.get(this.apiBaseUrl+'/'+serviceName, {
                params: queryParams
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
                { headers: {'content-type': 'application/json'} }
            );
            return response.data.data;
        }
        catch (err) {
            throw err;
        }
    }
};


export default apiClientSingleton;
