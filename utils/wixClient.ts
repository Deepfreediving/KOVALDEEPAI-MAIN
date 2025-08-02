import axios from 'axios';

interface WixQueryData {
  data?: Record<string, any>;
  options?: Record<string, any>;
}

class WixClient {
  /**
   * Generic GET request to Wix API via proxy
   */
  async get(path: string, params: Record<string, any> = {}) {
    try {
      const response = await axios.get(`/api/wix/wixProxy`, {
        params: { path, ...params },
      });
      return response.data;
    } catch (error: any) {
      console.error(`❌ WixClient GET Error: ${path}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generic POST request to Wix API via proxy
   */
  async post(path: string, data: any = {}, params: Record<string, any> = {}) {
    try {
      const response = await axios.post(`/api/wix/wixProxy`, data, {
        params: { path, ...params },
      });
      return response.data;
    } catch (error: any) {
      console.error(`❌ WixClient POST Error: ${path}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Shortcut for querying Wix data collections
   */
  async queryData(query: WixQueryData = {}) {
    return this.post('/v2/data/items/query', query);
  }

  /**
   * Shortcut for getting a specific data item by ID
   */
  async getItem(collectionId: string, itemId: string) {
    return this.get(`/v2/data/collections/${collectionId}/items/${itemId}`);
  }

  /**
   * Shortcut for creating a new data item
   */
  async createItem(collectionId: string, itemData: Record<string, any>) {
    return this.post(`/v2/data/collections/${collectionId}/items`, itemData);
  }

  /**
   * Shortcut for updating a data item
   */
  async updateItem(collectionId: string, itemId: string, itemData: Record<string, any>) {
    return this.post(`/v2/data/collections/${collectionId}/items/${itemId}`, itemData, {
      _method: 'PATCH',
    });
  }

  /**
   * Shortcut for deleting a data item
   */
  async deleteItem(collectionId: string, itemId: string) {
    return this.post(`/v2/data/collections/${collectionId}/items/${itemId}`, {}, {
      _method: 'DELETE',
    });
  }
}

const wixClient = new WixClient();
export default wixClient;
