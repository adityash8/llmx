import { WebflowSite } from '@/types'

const WEBFLOW_API_BASE = 'https://api.webflow.com/v2'
const WEBFLOW_OAUTH_BASE = 'https://webflow.com/oauth'

export interface WebflowOAuthTokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

export interface WebflowSiteResponse {
  id: string
  workspaceId: string
  displayName: string
  shortName: string
  previewUrl?: string
  createdOn: string
  lastPublished?: string
  lastUpdated: string
}

export class WebflowClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  async getSites(): Promise<WebflowSiteResponse[]> {
    const response = await fetch(`${WEBFLOW_API_BASE}/sites`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'accept-version': '1.0.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Webflow sites: ${response.statusText}`)
    }

    const data = await response.json()
    return data.sites || []
  }

  async getSite(siteId: string): Promise<WebflowSiteResponse> {
    const response = await fetch(`${WEBFLOW_API_BASE}/sites/${siteId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'accept-version': '1.0.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch Webflow site: ${response.statusText}`)
    }

    return response.json()
  }

  async publishAsset(siteId: string, fileName: string, content: string): Promise<string> {
    const response = await fetch(`${WEBFLOW_API_BASE}/sites/${siteId}/assets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'accept-version': '1.0.0'
      },
      body: JSON.stringify({
        fileName,
        fileData: Buffer.from(content).toString('base64')
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to publish asset to Webflow: ${response.statusText}`)
    }

    const data = await response.json()
    return data.url
  }

  async publishSite(siteId: string, domains: string[]): Promise<void> {
    const response = await fetch(`${WEBFLOW_API_BASE}/sites/${siteId}/publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'accept-version': '1.0.0'
      },
      body: JSON.stringify({
        publishToWebflowSubdomain: true,
        customDomains: domains
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to publish Webflow site: ${response.statusText}`)
    }
  }
}

export function getWebflowAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    scope: 'sites:read sites:write assets:write'
  })

  return `${WEBFLOW_OAUTH_BASE}/authorize?${params.toString()}`
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<WebflowOAuthTokens> {
  const response = await fetch(`${WEBFLOW_OAUTH_BASE}/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  return response.json()
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<WebflowOAuthTokens> {
  const response = await fetch(`${WEBFLOW_OAUTH_BASE}/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  if (!response.ok) {
    throw new Error('Failed to refresh access token')
  }

  return response.json()
}
