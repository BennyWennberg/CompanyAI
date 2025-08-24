// EntraAC Integration - Microsoft Graph Client
// Stellt MSAL Client Credentials und Graph API Helper zur Verfügung

import axios from 'axios';
import { ConfidentialClientApplication, ClientCredentialRequest } from '@azure/msal-node';
import { GraphResponse } from './types';

// MSAL Client für App-only Authentication (Client Credentials Flow)
let msalClient: ConfidentialClientApplication | null = null;

function initMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Entra ID credentials missing in environment variables');
    }

    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret,
      },
    });
  }
  return msalClient;
}

/**
 * Holt einen App-Token für Microsoft Graph API
 */
export async function getAppToken(): Promise<string> {
  try {
    const client = initMsalClient();
    const clientCredentialRequest: ClientCredentialRequest = {
      scopes: ['https://graph.microsoft.com/.default'],
    };

    const response = await client.acquireTokenByClientCredential(clientCredentialRequest);
    
    if (!response?.accessToken) {
      throw new Error('No access token received from Azure AD');
    }

    return response.accessToken;
  } catch (error) {
    console.error('Error getting app token:', error);
    throw new Error(`Failed to acquire token: ${error}`);
  }
}

/**
 * Führt einen GET-Request gegen Microsoft Graph API aus
 */
export async function graphGet<T>(path: string): Promise<T> {
  try {
    const token = await getAppToken();
    const baseUrl = process.env.GRAPH_BASE_URL || 'https://graph.microsoft.com';
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;

    const response = await axios.get<T>(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });

    return response.data;
  } catch (error) {
    console.error(`Error calling Graph API ${path}:`, error);
    throw new Error(`Graph API call failed: ${error}`);
  }
}

/**
 * Holt alle Seiten einer paginierten Graph API Response
 */
export async function graphGetAllPages<T>(initialPath: string): Promise<T[]> {
  const results: T[] = [];
  let nextLink: string | null = initialPath;

  while (nextLink) {
    try {
      const response: GraphResponse<T> = await graphGet<GraphResponse<T>>(nextLink);
      
      if (response.value) {
        results.push(...response.value);
      }

      // Nächste Seite URL extrahieren
      nextLink = response['@odata.nextLink'] || null;
      
      // Relative URLs zu absoluten URLs konvertieren
      if (nextLink && nextLink.startsWith('/')) {
        nextLink = `${process.env.GRAPH_BASE_URL || 'https://graph.microsoft.com'}${nextLink}`;
      }
      
      // Graph API Rate Limiting respektieren
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error fetching page ${nextLink}:`, error);
      break;
    }
  }

  return results;
}

/**
 * Testet die Verbindung zu Microsoft Graph
 */
export async function testConnection(): Promise<boolean> {
  try {
    await graphGet('/v1.0/organization');
    return true;
  } catch (error) {
    console.error('Graph connection test failed:', error);
    return false;
  }
}
